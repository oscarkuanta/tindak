import {
  NOTIFICATION_TYPES as TYPES,
  REPORT_STATUS_LABELS,
  SOCKET_EVENTS,
  SUPPORT_MILESTONES,
  USER_ROLES,
} from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { boardRoom, emitToRooms, emitToUsers, reportRoom } from '../../lib/realtime.js';

export function toNotification(row) {
  return {
    id: row.id,
    type: row.type,
    data: row.data,
    isRead: Boolean(row.readAt),
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

function uniqueIds(ids, exclude = []) {
  const skip = new Set(exclude.filter(Boolean));
  return [...new Set(ids.filter((id) => id && !skip.has(id)))];
}

export async function sendNotifications(userIds, type, data, { exclude = [] } = {}) {
  const recipients = uniqueIds(userIds, exclude);
  const created = [];
  for (const userId of recipients) {
    const row = await prisma.notification.create({ data: { userId, type, data } });
    created.push(row);
    emitToUsers([userId], SOCKET_EVENTS.NOTIFICATION_NEW, toNotification(row));
  }
  return created;
}

async function safely(label, run) {
  try {
    return await run();
  } catch (error) {
    logger.error({ err: error }, `Gagal mengirim notifikasi ${label}`);
    return null;
  }
}

export async function boardMemberIds(boardId) {
  const members = await prisma.boardMember.findMany({
    where: { boardId, status: 'ACTIVE' },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

async function boardAdminIds() {
  const admins = await prisma.user.findMany({
    where: { role: USER_ROLES.BOARD_ADMIN },
    select: { id: true },
  });
  return admins.map((admin) => admin.id);
}

async function loadReport(reportId) {
  return prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      title: true,
      status: true,
      severity: true,
      userId: true,
      isHidden: true,
      supportCount: true,
      dangerousCount: true,
      longStandingCount: true,
      annoyingCount: true,
      parentId: true,
      boardId: true,
      board: { select: { id: true, slug: true, name: true } },
    },
  });
}

function reportData(report, extra = {}) {
  return {
    reportId: report.id,
    reportTitle: report.title,
    boardSlug: report.board.slug,
    boardName: report.board.name,
    ...extra,
  };
}

function reportUpdatePayload(report) {
  return {
    id: report.id,
    boardSlug: report.board.slug,
    status: report.status,
    isHidden: report.isHidden,
    supportCount: report.supportCount,
    reactionCounts: {
      DANGEROUS: report.dangerousCount,
      LONG_STANDING: report.longStandingCount,
      ANNOYING: report.annoyingCount,
    },
  };
}

function broadcastReport(report, memberIds) {
  const payload = reportUpdatePayload(report);
  const rooms = [reportRoom(report.id)];
  if (!report.isHidden) rooms.push(boardRoom(report.board.slug));
  emitToRooms(rooms, SOCKET_EVENTS.REPORT_UPDATED, payload);
  emitToUsers(memberIds, SOCKET_EVENTS.QUEUE_UPDATED, {
    boardSlug: report.board.slug,
    reportId: report.id,
  });
}

export async function publishReportUpdated(reportId) {
  return safely('pembaruan laporan', async () => {
    const report = await loadReport(reportId);
    if (!report) return;
    broadcastReport(report, await boardMemberIds(report.boardId));
  });
}

export async function notifyReportCreated(reportId, actorUserId = null) {
  return safely('laporan baru', async () => {
    const report = await loadReport(reportId);
    if (!report) return;
    const members = await boardMemberIds(report.boardId);
    const dangerous = report.severity === 'DANGEROUS';
    const data = reportData(report, { severity: report.severity });
    await sendNotifications(
      members,
      dangerous ? TYPES.HANDLER_DANGEROUS_REPORT : TYPES.HANDLER_NEW_REPORT,
      data,
      { exclude: [actorUserId] },
    );
    const followers = await prisma.boardFollower.findMany({
      where: {
        boardId: report.boardId,
        notifyLevel: dangerous ? { in: ['ALL', 'DANGEROUS_ONLY'] } : 'ALL',
      },
      select: { userId: true },
    });
    await sendNotifications(
      followers.map((follower) => follower.userId),
      TYPES.BOARD_NEW_REPORT,
      data,
      { exclude: [actorUserId, ...members] },
    );
    if (!report.isHidden) {
      emitToRooms([boardRoom(report.board.slug)], SOCKET_EVENTS.REPORT_CREATED, {
        id: report.id,
        boardSlug: report.board.slug,
        severity: report.severity,
      });
    }
    emitToUsers(members, SOCKET_EVENTS.QUEUE_UPDATED, {
      boardSlug: report.board.slug,
      reportId: report.id,
    });
  });
}

function reporterNotification(report, toStatus, extra) {
  if (toStatus === 'NEED_INFO') {
    return {
      type: TYPES.REPORT_INFO_REQUESTED,
      data: reportData(report, { question: extra.question ?? null }),
    };
  }
  if (toStatus === 'DUPLICATE') {
    return {
      type: TYPES.REPORT_MARKED_DUPLICATE,
      data: reportData(report, { parentId: report.parentId }),
    };
  }
  return {
    type: TYPES.REPORT_STATUS_CHANGED,
    data: reportData(report, { status: toStatus, statusLabel: REPORT_STATUS_LABELS[toStatus] }),
  };
}

export async function notifyStatusChanged(
  reportId,
  { fromStatus, toStatus, actorUserId = null, ...extra },
) {
  return safely('perubahan status', async () => {
    const report = await loadReport(reportId);
    if (!report) return;
    const members = await boardMemberIds(report.boardId);
    const exclude = [actorUserId];

    if (report.userId) {
      const { type, data } = reporterNotification(report, toStatus, extra);
      await sendNotifications([report.userId], type, data, { exclude });
    }
    if (toStatus === 'RESOLVED') {
      const supporters = await prisma.support.findMany({
        where: { reportId },
        select: { userId: true },
      });
      await sendNotifications(
        supporters.map((support) => support.userId),
        TYPES.SUPPORTED_REPORT_RESOLVED,
        reportData(report),
        { exclude: [...exclude, report.userId] },
      );
    }
    if (toStatus === 'REOPENED') {
      await sendNotifications(members, TYPES.HANDLER_REPORT_REOPENED, reportData(report), {
        exclude,
      });
    }
    if (fromStatus === 'NEED_INFO' && toStatus === 'NEW') {
      await sendNotifications(members, TYPES.HANDLER_INFO_ANSWERED, reportData(report), {
        exclude,
      });
    }
    broadcastReport(report, members);
  });
}

export async function notifyReportModerated(
  reportId,
  { removed = false, actorUserId = null } = {},
) {
  return safely('moderasi laporan', async () => {
    const report = await loadReport(reportId);
    if (!report) return;
    if (report.userId) {
      await sendNotifications(
        [report.userId],
        removed ? TYPES.REPORT_REMOVED : TYPES.REPORT_HIDDEN,
        reportData(report),
        { exclude: [actorUserId] },
      );
    }
    broadcastReport(report, await boardMemberIds(report.boardId));
  });
}

export async function notifyEngagementChanged(reportId) {
  return safely('dukungan', async () => {
    const report = await loadReport(reportId);
    if (!report) return;
    broadcastReport(report, []);
    if (!report.userId || !SUPPORT_MILESTONES.includes(report.supportCount)) return;
    const sent = await prisma.notification.findMany({
      where: { userId: report.userId, type: TYPES.REPORT_SUPPORT_MILESTONE },
      select: { data: true },
    });
    const already = sent.some(
      (row) => row.data?.reportId === report.id && row.data?.milestone === report.supportCount,
    );
    if (already) return;
    await sendNotifications(
      [report.userId],
      TYPES.REPORT_SUPPORT_MILESTONE,
      reportData(report, { milestone: report.supportCount }),
    );
  });
}

export async function notifyBoardInvitation(member, board, inviterId) {
  return safely('undangan', () =>
    sendNotifications(
      [member.userId],
      TYPES.BOARD_INVITATION,
      { boardSlug: board.slug, boardName: board.name, invitationId: member.id },
      { exclude: [inviterId] },
    ),
  );
}

export async function notifyDueSoon(now = new Date(), hours) {
  const until = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const reports = await prisma.report.findMany({
    where: {
      severity: 'DANGEROUS',
      dueWarningSentAt: null,
      removedAt: null,
      dueAt: { gt: now, lte: until },
      status: { in: ['NEW', 'NEED_INFO', 'IN_PROGRESS', 'REOPENED'] },
    },
    select: { id: true },
  });
  for (const { id } of reports) {
    const { count } = await prisma.report.updateMany({
      where: { id, dueWarningSentAt: null },
      data: { dueWarningSentAt: now },
    });
    if (count === 0) continue;
    const report = await loadReport(id);
    await sendNotifications(
      await boardMemberIds(report.boardId),
      TYPES.HANDLER_DEADLINE_SOON,
      reportData(report, { hours }),
    );
  }
  return reports.length;
}

export async function sendRatingDigest(now = new Date()) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const groups = await prisma.boardRating.groupBy({
    by: ['boardId'],
    where: { updatedAt: { gt: since } },
    _count: { _all: true },
  });
  for (const group of groups) {
    const board = await prisma.board.findUnique({
      where: { id: group.boardId },
      select: { slug: true, name: true, status: true, trustScore: true, ratingCount: true },
    });
    if (!board || board.status === 'FROZEN') continue;
    await sendNotifications(await boardMemberIds(group.boardId), TYPES.BOARD_RATING_DIGEST, {
      boardSlug: board.slug,
      boardName: board.name,
      newRatings: group._count._all,
      ratingCount: board.ratingCount,
      trustScore: board.trustScore === null ? null : Math.round(board.trustScore * 10) / 10,
    });
  }
  return groups.length;
}

function boardData(board, extra = {}) {
  return { boardSlug: board.slug, boardName: board.name, ...extra };
}

export function publishBoardUpdated(board) {
  emitToRooms([boardRoom(board.slug)], SOCKET_EVENTS.BOARD_UPDATED, {
    slug: board.slug,
    status: board.status,
    verification: board.verification,
    verifiedAt: board.verifiedAt,
  });
}

export async function notifyBoardAdmins(type, board, extra = {}, { exclude = [] } = {}) {
  return safely(type, async () =>
    sendNotifications(await boardAdminIds(), type, boardData(board, extra), { exclude }),
  );
}

export async function notifyBoardOwner(type, board, extra = {}) {
  return safely(type, () => sendNotifications([board.ownerId], type, boardData(board, extra)));
}
