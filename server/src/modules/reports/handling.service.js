import {
  ERROR_CODES,
  REPORT_ACTIVE_STATUSES,
  REPORT_HANDLING_STATUS_LABELS,
  REPORT_REOPEN_LIMIT,
  canTransition,
} from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { removeFile } from '../../lib/storage.js';
import { AppError } from '../../utils/AppError.js';
import { getBoardMembership, recordHandlerActivity } from '../boards/boards.service.js';
import {
  REPORT_SORT_ORDER,
  findReportWithDetail,
  matchesTrackingSecret,
  preparePhotos,
  presentReports,
  reportNotFound,
  storePhotos,
  viewerContext,
} from './reports.service.js';
import { refreshReportScores } from '../engagement/scores.service.js';
import {
  REPORT_LIST_INCLUDE,
  STATUSES_WITHOUT_DEADLINE,
  toQueueItem,
  toReportDetail,
} from './reports.presenter.js';

const REPORT_CORE_SELECT = {
  id: true,
  boardId: true,
  userId: true,
  status: true,
  reopenCount: true,
  assigneeId: true,
  trackingCode: true,
  trackingSecretHash: true,
  board: { select: { status: true } },
};

function invalidTransition(from, to) {
  return new AppError(
    409,
    ERROR_CODES.INVALID_TRANSITION,
    `Status laporan tidak bisa diubah dari ${REPORT_HANDLING_STATUS_LABELS[from]} ke ${REPORT_HANDLING_STATUS_LABELS[to]}`,
  );
}

function assertCanTransition(report, to) {
  if (!canTransition(report.status, to)) throw invalidTransition(report.status, to);
}

async function applyTransition(tx, report, { to, actorType, actorId = null, reason, note, data }) {
  assertCanTransition(report, to);
  const { count } = await tx.report.updateMany({
    where: { id: report.id, status: report.status },
    data: { status: to, ...data },
  });
  if (count === 0) throw invalidTransition(report.status, to);
  await tx.reportEvent.create({
    data: {
      reportId: report.id,
      fromStatus: report.status,
      toStatus: to,
      actorType,
      actorId,
      reason: reason ?? null,
      note: note || null,
    },
  });
  await refreshReportScores(tx, report.id);
}

async function findCoreReport(id) {
  const report = await prisma.report.findUnique({ where: { id }, select: REPORT_CORE_SELECT });
  if (!report) throw reportNotFound();
  return report;
}

async function loadForHandler(id, user) {
  const report = await findCoreReport(id);
  if (report.board.status === 'FROZEN') throw reportNotFound();
  if (!(await getBoardMembership(report.boardId, user.id))) {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      'Hanya Penindak Board ini yang boleh menangani laporan',
    );
  }
  return report;
}

async function loadForReporter(id, user, { trackingCode, secret }) {
  const report = await findCoreReport(id);
  if (trackingCode || secret) {
    const valid = report.trackingCode === trackingCode && matchesTrackingSecret(report, secret);
    if (!valid) throw reportNotFound();
    return { report, actorId: user && report.userId === user.id ? user.id : null };
  }
  if (!user) {
    throw new AppError(
      401,
      ERROR_CODES.UNAUTHENTICATED,
      'Masuk sebagai pelapor atau gunakan Kode Lacak',
    );
  }
  if (report.userId !== user.id) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Hanya pelapor yang boleh melakukan ini');
  }
  return { report, actorId: user.id };
}

async function detailFor(id, user, override) {
  const report = await findReportWithDetail(id);
  const context = override ?? (await viewerContext(report, user));
  const [json] = await presentReports([report], user, (row) => toReportDetail(row, context));
  return json;
}

async function handlerAction(id, user, run) {
  const report = await loadForHandler(id, user);
  await prisma.$transaction(async (tx) => {
    await run(tx, report);
    await recordHandlerActivity(tx, report.boardId);
  });
  return detailFor(id, user);
}

export async function processReport(id, user, { assigneeId }) {
  return handlerAction(id, user, async (tx, report) => {
    if (assigneeId) {
      const assignee = await getBoardMembership(report.boardId, assigneeId);
      if (!assignee) {
        throw new AppError(
          404,
          ERROR_CODES.HANDLER_NOT_FOUND,
          'Penanggung jawab harus Penindak aktif di Board ini',
        );
      }
    }
    const nextAssignee = assigneeId === undefined ? report.assigneeId : assigneeId;
    await applyTransition(tx, report, {
      to: 'IN_PROGRESS',
      actorType: 'HANDLER',
      actorId: user.id,
      data: { assigneeId: nextAssignee },
    });
  });
}

export async function requestInfo(id, user, { question }) {
  return handlerAction(id, user, async (tx, report) => {
    await applyTransition(tx, report, {
      to: 'NEED_INFO',
      actorType: 'HANDLER',
      actorId: user.id,
      note: question,
    });
    await tx.infoRequest.create({ data: { reportId: report.id, question, askedById: user.id } });
  });
}

export async function rejectReport(id, user, { reason, note }) {
  return handlerAction(id, user, async (tx, report) => {
    await applyTransition(tx, report, {
      to: 'REJECTED',
      actorType: 'HANDLER',
      actorId: user.id,
      reason,
      note,
    });
  });
}

export async function markDuplicate(id, user, { parentId }) {
  return handlerAction(id, user, async (tx, report) => {
    assertCanTransition(report, 'DUPLICATE');
    const parent = await tx.report.findFirst({
      where: {
        id: parentId,
        boardId: report.boardId,
        isHidden: false,
        parentId: null,
        status: { in: [...REPORT_ACTIVE_STATUSES] },
      },
      select: { id: true },
    });
    if (!parent || parent.id === report.id) {
      throw new AppError(
        409,
        ERROR_CODES.INVALID_DUPLICATE,
        'Laporan induk harus laporan aktif lain di Board yang sama dan bukan duplikat',
      );
    }
    await applyTransition(tx, report, {
      to: 'DUPLICATE',
      actorType: 'HANDLER',
      actorId: user.id,
      note: `Duplikat dari laporan #${parent.id}`,
      data: { parentId: parent.id },
    });
  });
}

async function withStoredPhotos(files, options, run) {
  const photos = await storePhotos(await preparePhotos(files, options));
  try {
    return await run(photos);
  } catch (error) {
    await Promise.all(photos.map((photo) => removeFile(photo.key)));
    throw error;
  }
}

function mediaRows(reportId, photos, kind) {
  return photos.map((photo) => ({
    reportId,
    url: photo.url,
    storageKey: photo.key,
    kind,
    nsfwScore: photo.nsfwScore,
    isBlurred: photo.isBlurred,
  }));
}

export async function resolveReport(id, user, { note }, files) {
  const report = await loadForHandler(id, user);
  assertCanTransition(report, 'AWAITING_CONFIRMATION');
  await withStoredPhotos(files, { required: true }, (photos) =>
    prisma.$transaction(async (tx) => {
      await applyTransition(tx, report, {
        to: 'AWAITING_CONFIRMATION',
        actorType: 'HANDLER',
        actorId: user.id,
        note,
      });
      await tx.reportMedia.createMany({ data: mediaRows(report.id, photos, 'AFTER') });
      await recordHandlerActivity(tx, report.boardId);
    }),
  );
  return detailFor(id, user);
}

export async function answerInfo(id, user, { answer, trackingCode, secret }) {
  const { report, actorId } = await loadForReporter(id, user, { trackingCode, secret });
  const latest = await prisma.infoRequest.findFirst({
    where: { reportId: report.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  if (latest?.answer) {
    throw new AppError(409, ERROR_CODES.INFO_ALREADY_ANSWERED, 'Pertanyaan ini sudah dijawab');
  }
  if (report.status !== 'NEED_INFO' || !latest) throw invalidTransition(report.status, 'NEW');

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.infoRequest.updateMany({
      where: { id: latest.id, answer: null },
      data: { answer, answeredAt: new Date() },
    });
    if (count === 0) {
      throw new AppError(409, ERROR_CODES.INFO_ALREADY_ANSWERED, 'Pertanyaan ini sudah dijawab');
    }
    await applyTransition(tx, report, {
      to: 'NEW',
      actorType: 'REPORTER',
      actorId,
      note: 'Pelapor menjawab pertanyaan Penindak',
    });
  });
  return detailFor(id, user, { isReporter: true });
}

export async function confirmReport(id, user, input, files) {
  const { report, actorId } = await loadForReporter(id, user, input);
  if (report.status !== 'AWAITING_CONFIRMATION') {
    throw invalidTransition(report.status, input.result === 'resolved' ? 'RESOLVED' : 'REOPENED');
  }
  if (input.result === 'resolved' && files?.length) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Foto tidak valid', [
      { field: 'photos', message: 'Foto tambahan hanya untuk laporan yang belum beres' },
    ]);
  }

  const now = new Date();
  let change;
  if (input.result === 'resolved') {
    change = {
      to: 'RESOLVED',
      note: input.note || 'Pelapor mengonfirmasi masalah sudah beres',
      data: { resolvedAt: now },
    };
  } else if (report.reopenCount < REPORT_REOPEN_LIMIT) {
    change = { to: 'REOPENED', note: input.note, data: { reopenCount: { increment: 1 } } };
  } else {
    change = {
      to: 'RESOLVED',
      note: `Pelapor tidak puas: ${input.note}`,
      data: { resolvedAt: now, reporterNotSatisfied: true },
    };
  }

  await withStoredPhotos(files, { required: false }, (photos) =>
    prisma.$transaction(async (tx) => {
      await applyTransition(tx, report, { ...change, actorType: 'REPORTER', actorId });
      if (photos.length > 0) {
        await tx.reportMedia.createMany({ data: mediaRows(report.id, photos, 'EXTRA') });
      }
    }),
  );
  return detailFor(id, user, { isReporter: true });
}

export async function autoConfirmReports(now = new Date(), olderThanDays = 3) {
  const cutoff = new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000);
  const waiting = await prisma.report.findMany({
    where: { status: 'AWAITING_CONFIRMATION' },
    select: {
      ...REPORT_CORE_SELECT,
      events: {
        where: { toStatus: 'AWAITING_CONFIRMATION' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  let resolved = 0;
  for (const report of waiting) {
    const since = report.events[0]?.createdAt;
    if (!since || since > cutoff) continue;
    try {
      await prisma.$transaction((tx) =>
        applyTransition(tx, report, {
          to: 'RESOLVED',
          actorType: 'SYSTEM',
          note: 'Dikonfirmasi otomatis',
          data: { resolvedAt: now },
        }),
      );
      resolved += 1;
    } catch (error) {
      if (error?.code !== ERROR_CODES.INVALID_TRANSITION) throw error;
    }
  }
  return resolved;
}

const QUEUE_INCLUDE = {
  ...REPORT_LIST_INCLUDE,
  infoRequests: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
};

function overdueWhere(now) {
  return {
    severity: 'DANGEROUS',
    dueAt: { lt: now },
    status: { notIn: [...STATUSES_WITHOUT_DEADLINE] },
  };
}

export async function listQueue(board, query, user, now = new Date()) {
  const where = {
    boardId: board.id,
    isHidden: false,
    ...(query.status && { status: query.status }),
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.severity && { severity: query.severity }),
    ...(query.assigneeId && { assigneeId: query.assigneeId }),
    ...(query.overdue === true && overdueWhere(now)),
    ...(query.overdue === false && { NOT: overdueWhere(now) }),
  };
  const [total, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      include: QUEUE_INCLUDE,
      orderBy: REPORT_SORT_ORDER[query.sort ?? 'priority'],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    data: await presentReports(rows, user, toQueueItem),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}
