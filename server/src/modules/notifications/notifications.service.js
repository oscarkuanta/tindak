import { ERROR_CODES, NOTIFICATION_TYPES } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import {
  notifyBoardAdmins,
  notifyBoardOwner,
  publishBoardUpdated,
  toNotification,
} from './notify.service.js';

export async function notifyBoardAdminsNewCandidate(board) {
  await notifyBoardAdmins(NOTIFICATION_TYPES.BOARD_CANDIDATE_NEW, board, {
    ratingCount: board.ratingCount,
  });
}

export async function notifyBoardNeedsReview(board) {
  await notifyBoardAdmins(NOTIFICATION_TYPES.BOARD_NEEDS_REVIEW, board, {
    status: board.status,
  });
}

export async function notifyBoardOwnerChanged(board, { previousOwnerId, newOwnerId }) {
  if (board.verification !== 'OFFICIAL') return;
  await notifyBoardAdmins(NOTIFICATION_TYPES.BOARD_OWNER_CHANGED, board, {
    previousOwnerId,
    newOwnerId,
  });
}

export async function notifyBoardVerified(board) {
  publishBoardUpdated(board);
  await notifyBoardOwner(NOTIFICATION_TYPES.BOARD_VERIFIED, board);
}

export async function notifyBoardVerificationRevoked(board, reason) {
  publishBoardUpdated(board);
  await notifyBoardOwner(NOTIFICATION_TYPES.BOARD_VERIFICATION_REVOKED, board, {
    reason: reason ?? null,
  });
}

export async function listNotifications(user, { page, pageSize, unread }) {
  const where = { userId: user.id, ...(unread && { readAt: null }) };
  const [total, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    data: rows.map(toNotification),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function unreadCount(user) {
  return { count: await prisma.notification.count({ where: { userId: user.id, readAt: null } }) };
}

export async function markRead(user, id) {
  const notification = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  if (!notification) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Notifikasi tidak ditemukan');
  }
  const updated = notification.readAt
    ? notification
    : await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return toNotification(updated);
}

export async function markAllRead(user) {
  const { count } = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: count };
}
