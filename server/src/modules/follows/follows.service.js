import { ERROR_CODES } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { decorateCards, findVisibleBoard, getBoardMembership } from '../boards/boards.service.js';

export async function followBoard(slug, user) {
  const board = await findVisibleBoard(slug, user);
  if (await getBoardMembership(board.id, user.id)) {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      'Penindak tidak bisa mengikuti Board yang dikelolanya',
    );
  }
  const follow = await prisma.boardFollower.upsert({
    where: { boardId_userId: { boardId: board.id, userId: user.id } },
    create: { boardId: board.id, userId: user.id },
    update: {},
  });
  return { notifyLevel: follow.notifyLevel };
}

export async function unfollowBoard(slug, user) {
  const board = await findVisibleBoard(slug, user);
  await prisma.boardFollower.deleteMany({ where: { boardId: board.id, userId: user.id } });
}

export async function updateFollowNotifyLevel(slug, user, { notifyLevel }) {
  const board = await findVisibleBoard(slug, user);
  const { count } = await prisma.boardFollower.updateMany({
    where: { boardId: board.id, userId: user.id },
    data: { notifyLevel },
  });
  if (count === 0) {
    throw new AppError(404, ERROR_CODES.FOLLOW_NOT_FOUND, 'Kamu belum mengikuti Board ini');
  }
  return { notifyLevel };
}

export async function listMyFollows(user) {
  const follows = await prisma.boardFollower.findMany({
    where: { userId: user.id, board: { status: { not: 'FROZEN' } } },
    include: { board: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const cards = await decorateCards(
    follows.map((follow) => follow.board),
    user,
  );
  return follows.map((follow, index) => ({
    board: cards[index],
    notifyLevel: follow.notifyLevel,
    createdAt: follow.createdAt,
  }));
}
