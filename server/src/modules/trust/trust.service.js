import { prisma } from '../../lib/prisma.js';
import { openFakeBoardFlagCount } from '../moderation/flags.service.js';
import {
  notifyBoardAdminsNewCandidate,
  notifyBoardNeedsReview,
} from '../notifications/notifications.service.js';
import {
  candidateChecklist,
  computeRejectedRate,
  computeResponseRate,
  computeTrustLabel,
  computeTrustScore,
  isCandidate,
  roundTo,
} from './trustScore.js';
import { VERIFICATION_RULES } from '@tindak/shared';

export async function lastSkippedAt(boardId, client = prisma) {
  const log = await client.boardVerificationLog.findFirst({
    where: { boardId, action: 'SKIPPED' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { createdAt: true },
  });
  return log?.createdAt ?? null;
}

export async function boardChecklist(board, now = new Date()) {
  const [openFakeBoardFlags, skippedAt] = await Promise.all([
    openFakeBoardFlagCount(board.id),
    lastSkippedAt(board.id),
  ]);
  return candidateChecklist(board, { openFakeBoardFlags, lastSkippedAt: skippedAt }, now);
}

export function trustSnapshot(board) {
  return {
    ratingCount: board.ratingCount,
    trustScore: roundTo(board.trustScore, 2),
    responseRate: roundTo(board.responseRate, 4),
    rejectedRate: roundTo(board.rejectedRate, 4),
  };
}

async function reportStats(boardId, now) {
  const reports = await prisma.report.findMany({
    where: { boardId, removedAt: null },
    select: {
      createdAt: true,
      status: true,
      events: {
        where: { fromStatus: 'NEW' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  return {
    responseRate: computeResponseRate(
      reports.map((report) => ({
        createdAt: report.createdAt,
        firstTouchedAt: report.events[0]?.createdAt ?? null,
      })),
      now,
    ),
    rejectedRate: computeRejectedRate(
      reports.length,
      reports.filter((report) => report.status === 'REJECTED').length,
    ),
  };
}

export function needsReview(board) {
  if (board.verification !== 'OFFICIAL') return false;
  return (
    board.status === 'INACTIVE' ||
    (board.trustScore !== null &&
      roundTo(board.trustScore, 1) < VERIFICATION_RULES.REVIEW_TRUST_SCORE_BELOW)
  );
}

export async function recomputeBoardTrust(boardId, now = new Date()) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return null;
  const [ratings, stats] = await Promise.all([
    prisma.boardRating.aggregate({
      where: { boardId },
      _count: { _all: true },
      _sum: { stars: true },
    }),
    reportStats(boardId, now),
  ]);
  const ratingCount = ratings._count._all;
  const ratingSum = ratings._sum.stars ?? 0;
  const trustScore = computeTrustScore({
    ratingCount,
    ratingSum,
    responseRate: stats.responseRate,
  });
  const next = {
    ratingCount,
    ratingSum,
    responseRate: stats.responseRate,
    rejectedRate: stats.rejectedRate,
    trustScore,
    trustLabel: computeTrustLabel({ ratingCount, trustScore }),
  };
  const checklist = await boardChecklist({ ...board, ...next }, now);
  const candidate = isCandidate(checklist);
  const candidateSince = candidate ? (board.candidateSince ?? now) : null;
  const updated = await prisma.board.update({
    where: { id: boardId },
    data: { ...next, candidateSince },
  });
  if (candidate && !board.candidateSince) await notifyBoardAdminsNewCandidate(updated);
  if (needsReview(updated) && !needsReview(board)) await notifyBoardNeedsReview(updated);
  return updated;
}

export async function recomputeAllBoardTrust(now = new Date()) {
  const boards = await prisma.board.findMany({ select: { id: true } });
  for (const board of boards) await recomputeBoardTrust(board.id, now);
  return boards.length;
}
