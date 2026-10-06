import { ERROR_CODES, REPORT_MAX_PHOTOS, USER_ROLES, priorityScore } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { isBanned } from '../../lib/bans.js';
import { verifyTurnstile } from '../../lib/turnstile.js';
import { detectImageType, normalizeImage } from '../../lib/images.js';
import { nsfwVerdict, scoreImage } from '../../lib/nsfw.js';
import { removeFile, saveFile } from '../../lib/storage.js';
import { AppError } from '../../utils/AppError.js';
import { hashIp, randomToken, safeEqualHex, sha256 } from '../../utils/crypto.js';
import { generateTrackingCode } from '../../utils/trackingCode.js';
import { findVisibleBoard, getBoardMembership } from '../boards/boards.service.js';
import { assertReportQuota } from './reportQuota.js';
import {
  REPORT_DETAIL_INCLUDE,
  REPORT_LIST_INCLUDE,
  toReport,
  toReportDetail,
  withViewerEngagement,
} from './reports.presenter.js';
import { viewerEngagement } from '../engagement/engagement.service.js';

const NEWEST_FIRST = [{ createdAt: 'desc' }, { id: 'desc' }];

export const REPORT_SORT_ORDER = Object.freeze({
  hot: [{ hotScore: 'desc' }, ...NEWEST_FIRST],
  priority: [{ priorityScore: 'desc' }, ...NEWEST_FIRST],
  new: NEWEST_FIRST,
  resolved: [{ resolvedAt: 'desc' }, ...NEWEST_FIRST],
});

export async function presentReports(rows, user, present = toReport) {
  const engagement = await viewerEngagement(
    rows.map((row) => row.id),
    user,
  );
  return rows.map((row) => withViewerEngagement(present(row), row, user, engagement));
}

async function presentDetail(report, user, context) {
  const [json] = await presentReports([report], user, (row) => toReportDetail(row, context));
  return json;
}

const TRACKING_CODE_RETRIES = 5;
const HOUR_MS = 60 * 60 * 1000;

export function reportNotFound() {
  return new AppError(404, ERROR_CODES.REPORT_NOT_FOUND, 'Laporan tidak ditemukan');
}

function photoError(message) {
  return new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Foto tidak valid', [
    { field: 'photos', message },
  ]);
}

function trackingUrlFor(code, secret) {
  const url = new URL(`/lacak/${code}`, env.CLIENT_URL);
  url.searchParams.set('secret', secret);
  return url.toString();
}

export async function viewerContext(report, user) {
  const membership = user ? await getBoardMembership(report.boardId, user.id) : null;
  const isHandler = Boolean(membership);
  return {
    isHandler,
    isStaff: isHandler || user?.role === USER_ROLES.ADMIN,
    isReporter: Boolean(user && report.userId === user.id),
  };
}

export async function findReportWithDetail(id) {
  const report = await prisma.report.findUnique({ where: { id }, include: REPORT_DETAIL_INCLUDE });
  if (!report) throw reportNotFound();
  return report;
}

export function matchesTrackingSecret(report, secret) {
  return Boolean(secret) && safeEqualHex(report.trackingSecretHash, sha256(secret));
}

export async function preparePhotos(files, { required = true } = {}) {
  if (!files?.length) {
    if (required) throw photoError('Unggah minimal 1 foto');
    return [];
  }
  if (files.length > REPORT_MAX_PHOTOS) throw photoError(`Maksimal ${REPORT_MAX_PHOTOS} foto`);

  const prepared = [];
  for (const file of files) {
    if (!detectImageType(file.buffer)) {
      throw photoError('File harus berupa foto JPEG, PNG, atau WebP');
    }
    let buffer;
    try {
      buffer = await normalizeImage(file.buffer);
    } catch {
      throw photoError('Foto rusak atau tidak dapat dibaca');
    }
    const nsfwScore = await scoreImage(buffer);
    const verdict = nsfwVerdict(nsfwScore);
    if (verdict === 'REJECT') {
      throw new AppError(
        422,
        ERROR_CODES.IMAGE_REJECTED,
        'Foto ditolak karena terdeteksi berisi konten tidak pantas',
      );
    }
    prepared.push({ buffer, nsfwScore, isBlurred: verdict === 'BLUR' });
  }
  return prepared;
}

export async function storePhotos(prepared) {
  const stored = [];
  try {
    for (const photo of prepared) {
      stored.push({ ...photo, ...(await saveFile(photo.buffer, 'webp')) });
    }
    return stored;
  } catch (error) {
    await Promise.all(stored.map((photo) => removeFile(photo.key)));
    throw error;
  }
}

async function insertReport(data, photos) {
  for (let attempt = 1; attempt <= TRACKING_CODE_RETRIES; attempt += 1) {
    try {
      return await prisma.report.create({
        data: {
          ...data,
          trackingCode: generateTrackingCode(),
          media: {
            create: photos.map((photo) => ({
              url: photo.url,
              storageKey: photo.key,
              kind: 'BEFORE',
              nsfwScore: photo.nsfwScore,
              isBlurred: photo.isBlurred,
            })),
          },
          events: {
            create: {
              toStatus: 'NEW',
              actorType: 'REPORTER',
              actorId: data.userId,
              note: 'Laporan dibuat',
            },
          },
        },
        include: REPORT_DETAIL_INCLUDE,
      });
    } catch (error) {
      const codeClash =
        error?.code === 'P2002' && String(error.meta?.target ?? 'tracking').includes('tracking');
      if (!codeClash || attempt === TRACKING_CODE_RETRIES) throw error;
    }
  }
  throw new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'Gagal membuat Kode Lacak');
}

export async function createReport({ slug, user, input, files, ip, guestTokenHash }) {
  const board = await findVisibleBoard(slug, user);
  if (board.status === 'FROZEN') {
    throw new AppError(404, ERROR_CODES.BOARD_NOT_FOUND, 'Board tidak ditemukan');
  }

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, boardId: board.id },
    select: { id: true },
  });
  if (!category) {
    throw new AppError(404, ERROR_CODES.CATEGORY_NOT_FOUND, 'Kategori tidak ada di Board ini', [
      { field: 'categoryId', message: 'Pilih kategori dari Board ini' },
    ]);
  }

  const ipHash = hashIp(ip);
  const identity = { userId: user?.id ?? null, guestTokenHash, ipHash };
  if (await isBanned(identity)) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Kamu sedang tidak diizinkan mengirim laporan');
  }
  await assertReportQuota({ user, guestTokenHash, ipHash });
  await verifyTurnstile(input.turnstileToken, ip);

  const photos = await storePhotos(await preparePhotos(files));
  const secret = randomToken(24);
  const createdAt = new Date();

  let report;
  try {
    report = await insertReport(
      {
        boardId: board.id,
        categoryId: category.id,
        userId: user?.id ?? null,
        isAnonymous: user ? input.isAnonymous : true,
        guestTokenHash: user ? null : guestTokenHash,
        ipHash,
        title: input.title,
        description: input.description,
        locationDetail: input.locationDetail,
        severity: input.severity,
        priorityScore: priorityScore({ supportCount: 1, severity: input.severity }),
        trackingSecretHash: sha256(secret),
        needsModeration: photos.some((photo) => photo.isBlurred),
        dueAt:
          input.severity === 'DANGEROUS'
            ? new Date(createdAt.getTime() + board.dangerousTargetHours * HOUR_MS)
            : null,
        createdAt,
      },
      photos,
    );
  } catch (error) {
    await Promise.all(photos.map((photo) => removeFile(photo.key)));
    throw error;
  }

  return {
    report: await presentDetail(report, user, await viewerContext(report, user)),
    trackingCode: report.trackingCode,
    trackingUrl: trackingUrlFor(report.trackingCode, secret),
  };
}

export async function paginate(where, { page, pageSize }, { user, orderBy = NEWEST_FIRST } = {}) {
  const [total, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      include: REPORT_LIST_INCLUDE,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    data: await presentReports(rows, user),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function listBoardReports(slug, user, query) {
  const board = await findVisibleBoard(slug, user);
  const where = {
    boardId: board.id,
    isHidden: false,
    ...(query.status && { status: query.status }),
    ...(query.sort === 'resolved' && { status: 'RESOLVED' }),
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.severity && { severity: query.severity }),
    ...(query.q && { title: { contains: query.q } }),
  };
  return paginate(where, query, { user, orderBy: REPORT_SORT_ORDER[query.sort] });
}

export async function listMyReports(user, query) {
  return paginate({ userId: user.id }, query, { user });
}

export async function listHomeFeed(user, { tab, page, pageSize }) {
  if (tab === 'following' && !user) {
    throw new AppError(
      401,
      ERROR_CODES.UNAUTHENTICATED,
      'Masuk untuk melihat Board yang kamu ikuti',
    );
  }
  const where = {
    isHidden: false,
    board: {
      status: { not: 'FROZEN' },
      ...(tab === 'following' && { followers: { some: { userId: user.id } } }),
    },
  };
  return paginate(
    where,
    { page, pageSize },
    { user, orderBy: tab === 'following' ? NEWEST_FIRST : REPORT_SORT_ORDER.hot },
  );
}

export async function getReportDetail(id, user) {
  const report = await findReportWithDetail(id);
  const context = await viewerContext(report, user);
  const { isStaff, isReporter: isAuthor } = context;
  const boardHidden =
    report.board.status === 'FROZEN' && !isStaff && user?.role !== USER_ROLES.BOARD_ADMIN;
  if ((report.isHidden && !isStaff && !isAuthor) || boardHidden) throw reportNotFound();

  return presentDetail(report, user, context);
}

export async function getTrackedReport(code, secret) {
  const report = await prisma.report.findUnique({
    where: { trackingCode: code },
    include: REPORT_DETAIL_INCLUDE,
  });
  if (!report || !matchesTrackingSecret(report, secret)) throw reportNotFound();
  return presentDetail(report, null, { isReporter: true });
}
