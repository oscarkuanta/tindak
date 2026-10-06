import { ERROR_CODES, RATING_BLOCK_REASONS, RATING_QUICK_TAGS } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { findActiveBan } from '../../lib/bans.js';
import { AppError } from '../../utils/AppError.js';
import { findVisibleBoard, getBoardMembership } from '../boards/boards.service.js';
import { recomputeBoardTrust } from './trust.service.js';
import { roundTo } from './trustScore.js';

function blocked(code) {
  return { canRate: false, reasonCode: code, reason: RATING_BLOCK_REASONS[code] };
}

async function ratingEligibility(board, user, identity = {}) {
  if (!user) return blocked('LOGIN_REQUIRED');
  if (board.status === 'FROZEN') return blocked('BOARD_FROZEN');
  if (await getBoardMembership(board.id, user.id)) return blocked('BOARD_STAFF');
  if (await findActiveBan({ ...identity, userId: user.id })) return blocked('BANNED');
  const follow = await prisma.boardFollower.findUnique({
    where: { boardId_userId: { boardId: board.id, userId: user.id } },
    select: { id: true },
  });
  if (!follow) return blocked('NOT_FOLLOWING');
  return { canRate: true, reasonCode: null, reason: null };
}

function toRating(rating) {
  if (!rating) return null;
  return {
    stars: rating.stars,
    quickTag: rating.quickTag,
    createdAt: rating.createdAt,
    updatedAt: rating.updatedAt,
  };
}

export function toTrustSummary(board) {
  return {
    trustScore: roundTo(board.trustScore, 1),
    trustLabel: board.status === 'INACTIVE' ? 'INACTIVE' : board.trustLabel,
    ratingCount: board.ratingCount,
    averageStars: board.ratingCount ? roundTo(board.ratingSum / board.ratingCount, 1) : null,
    responseRate: board.responseRate === null ? null : Math.round(board.responseRate * 100),
    rejectedPercentage: Math.round(board.rejectedRate * 100),
  };
}

export async function getMyRating(slug, user) {
  const board = await findVisibleBoard(slug, user);
  const [rating, eligibility] = await Promise.all([
    user
      ? prisma.boardRating.findUnique({
          where: { boardId_userId: { boardId: board.id, userId: user.id } },
        })
      : null,
    ratingEligibility(board, user),
  ]);
  return { rating: toRating(rating), ...eligibility };
}

export async function rateBoard(slug, user, { stars, quickTag }, identity) {
  const board = await findVisibleBoard(slug, user);
  const eligibility = await ratingEligibility(board, user, identity);
  if (!eligibility.canRate) {
    throw new AppError(403, ERROR_CODES.RATING_NOT_ALLOWED, eligibility.reason);
  }
  const rating = await prisma.boardRating.upsert({
    where: { boardId_userId: { boardId: board.id, userId: user.id } },
    create: { boardId: board.id, userId: user.id, stars, quickTag: quickTag ?? null },
    update: { stars, quickTag: quickTag ?? null },
  });
  const updated = await recomputeBoardTrust(board.id);
  return { rating: toRating(rating), board: { slug: updated.slug, ...toTrustSummary(updated) } };
}

export async function ratingDistribution(boardId) {
  const [stars, tags] = await Promise.all([
    prisma.boardRating.groupBy({ by: ['stars'], where: { boardId }, _count: { _all: true } }),
    prisma.boardRating.groupBy({
      by: ['quickTag'],
      where: { boardId, quickTag: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const starCount = new Map(stars.map((row) => [row.stars, row._count._all]));
  const tagCount = new Map(tags.map((row) => [row.quickTag, row._count._all]));
  return {
    distribution: Object.fromEntries(
      [1, 2, 3, 4, 5].map((star) => [star, starCount.get(star) ?? 0]),
    ),
    quickTags: Object.fromEntries(RATING_QUICK_TAGS.map((tag) => [tag, tagCount.get(tag) ?? 0])),
  };
}

export async function getRatingSummary(slug, user) {
  const board = await findVisibleBoard(slug, user);
  return { ...toTrustSummary(board), ...(await ratingDistribution(board.id)) };
}
