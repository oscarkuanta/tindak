import { USER_ROLES } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { canSeeFrozenBoards, getBoardMembership } from '../boards/boards.service.js';
import { matchesTrackingSecret } from '../reports/reports.service.js';

export async function canSubscribeBoard(slug, user) {
  if (typeof slug !== 'string' || slug.length > 120) return false;
  const board = await prisma.board.findUnique({ where: { slug }, select: { status: true } });
  if (!board) return false;
  return board.status !== 'FROZEN' || canSeeFrozenBoards(user);
}

export async function canSubscribeReport(reportId, user, { trackingCode, secret } = {}) {
  const id = Number(reportId);
  if (!Number.isInteger(id) || id <= 0) return false;
  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      boardId: true,
      userId: true,
      isHidden: true,
      removedAt: true,
      trackingCode: true,
      trackingSecretHash: true,
      board: { select: { status: true } },
    },
  });
  if (!report) return false;
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  if (report.removedAt) return isAdmin;
  const isMember = Boolean(user && (await getBoardMembership(report.boardId, user.id)));
  if (report.board.status === 'FROZEN') return isMember || canSeeFrozenBoards(user);
  if (!report.isHidden) return true;
  const hasTracking = trackingCode === report.trackingCode && matchesTrackingSecret(report, secret);
  return isAdmin || isMember || Boolean(user && report.userId === user.id) || hasTracking;
}
