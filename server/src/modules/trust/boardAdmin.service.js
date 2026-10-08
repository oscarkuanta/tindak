import { CANDIDATE_REQUIREMENT_LABELS, ERROR_CODES, VERIFICATION_RULES } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { recordAudit } from '../../lib/audit.js';
import { AppError } from '../../utils/AppError.js';
import {
  notifyBoardVerificationRevoked,
  notifyBoardVerified,
} from '../notifications/notifications.service.js';
import {
  boardChecklist,
  needsReview,
  recomputeBoardTrust,
  trustSnapshot,
} from './trust.service.js';
import { ratingDistribution, toTrustSummary } from './ratings.service.js';
import { boardAgeDays } from './trustScore.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CANDIDATE_WHERE = { candidateSince: { not: null }, verification: 'COMMUNITY' };
const OWNER_SELECT = { select: { id: true, name: true, email: true } };

function pageMeta(page, pageSize, total) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

function reviewWhere() {
  return {
    OR: [
      { status: 'INACTIVE' },
      { trustScore: { lt: VERIFICATION_RULES.REVIEW_TRUST_SCORE_BELOW } },
    ],
  };
}

async function findBoard(slug) {
  const board = await prisma.board.findUnique({ where: { slug } });
  if (!board) throw new AppError(404, ERROR_CODES.BOARD_NOT_FOUND, 'Board tidak ditemukan');
  return board;
}

function toBoardRow(board, now) {
  return {
    id: board.id,
    slug: board.slug,
    name: board.name,
    city: board.city,
    type: board.type,
    status: board.status,
    verification: board.verification,
    verifiedAt: board.verifiedAt,
    candidateSince: board.candidateSince,
    ageDays: boardAgeDays(board, now),
    ...toTrustSummary(board),
  };
}

export function toVerificationLog(log, { withReason = true } = {}) {
  return {
    id: log.id,
    action: log.action,
    actor: log.actor ?? null,
    reason: withReason ? log.reason : null,
    snapshot: withReason ? log.snapshot : null,
    createdAt: log.createdAt,
  };
}

export async function getBoardAdminStats(now = new Date()) {
  const since = new Date(now.getTime() - VERIFICATION_RULES.REVOKED_STATS_DAYS * DAY_MS);
  const [candidates, official, revokedLast30Days, needsReviewCount] = await Promise.all([
    prisma.board.count({ where: CANDIDATE_WHERE }),
    prisma.board.count({ where: { verification: 'OFFICIAL' } }),
    prisma.boardVerificationLog.count({ where: { action: 'REVOKED', createdAt: { gte: since } } }),
    prisma.board.count({ where: { verification: 'OFFICIAL', ...reviewWhere() } }),
  ]);
  return { candidates, official, revokedLast30Days, needsReview: needsReviewCount };
}

export async function listCandidates({ page, pageSize }, now = new Date()) {
  const [total, boards] = await Promise.all([
    prisma.board.count({ where: CANDIDATE_WHERE }),
    prisma.board.findMany({
      where: CANDIDATE_WHERE,
      orderBy: [{ ratingCount: 'desc' }, { trustScore: 'desc' }, { candidateSince: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    data: boards.map((board) => toBoardRow(board, now)),
    meta: pageMeta(page, pageSize, total),
  };
}

export async function listOfficialBoards({ q, review, page, pageSize }, now = new Date()) {
  const where = {
    verification: 'OFFICIAL',
    ...(q && { name: { contains: q } }),
    ...(review && reviewWhere()),
  };
  const [total, boards] = await Promise.all([
    prisma.board.count({ where }),
    prisma.board.findMany({
      where,
      include: { verifiedBy: { select: { id: true, name: true } } },
      orderBy: [{ verifiedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    data: boards.map((board) => ({
      ...toBoardRow(board, now),
      verifiedBy: board.verifiedBy,
      needsReview: needsReview(board),
    })),
    meta: pageMeta(page, pageSize, total),
  };
}

function presentChecklist(checklist) {
  return checklist.map((item) => ({
    ...item,
    label: CANDIDATE_REQUIREMENT_LABELS[item.key],
  }));
}

export async function getVerificationDetail(slug, now = new Date()) {
  const board = await prisma.board.findUnique({
    where: { slug },
    include: { owner: OWNER_SELECT, verifiedBy: { select: { id: true, name: true } } },
  });
  if (!board) throw new AppError(404, ERROR_CODES.BOARD_NOT_FOUND, 'Board tidak ditemukan');
  const [ratings, checklist, followerCount, reportGroups, flagGroups, logs] = await Promise.all([
    ratingDistribution(board.id),
    boardChecklist(board, now),
    prisma.boardFollower.count({ where: { boardId: board.id } }),
    prisma.report.groupBy({
      by: ['status'],
      where: { boardId: board.id, removedAt: null },
      _count: { _all: true },
    }),
    prisma.flag.groupBy({
      by: ['reason', 'status'],
      where: { targetType: 'BOARD', targetId: board.id },
      _count: { _all: true },
    }),
    prisma.boardVerificationLog.findMany({
      where: { boardId: board.id },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
  ]);
  const reportsByStatus = Object.fromEntries(
    reportGroups.map((row) => [row.status, row._count._all]),
  );
  const flags = {};
  for (const row of flagGroups) {
    flags[row.reason] ??= { open: 0, total: 0 };
    flags[row.reason].total += row._count._all;
    if (row.status === 'OPEN') flags[row.reason].open += row._count._all;
  }
  return {
    ...toBoardRow(board, now),
    description: board.description,
    managerTitle: board.managerTitle,
    createdAt: board.createdAt,
    owner: board.owner,
    verifiedBy: board.verifiedBy,
    followerCount,
    restoredByAdminCount: board.restoredByAdminCount,
    needsReview: needsReview(board),
    ...ratings,
    reports: {
      total: Object.values(reportsByStatus).reduce((sum, count) => sum + count, 0),
      resolved: reportsByStatus.RESOLVED ?? 0,
      rejected: reportsByStatus.REJECTED ?? 0,
    },
    flags,
    checklist: presentChecklist(checklist),
    isCandidateEligible: checklist.every((item) => item.passed),
    history: logs.map((log) => toVerificationLog(log)),
  };
}

export async function verifyBoard(slug, admin, { note }, now = new Date()) {
  const board = await findBoard(slug);
  if (board.status === 'FROZEN') {
    throw new AppError(
      409,
      ERROR_CODES.CONFLICT,
      'Board yang sedang di-freeze tidak bisa dijadikan Official',
    );
  }
  if (board.verification === 'OFFICIAL') {
    throw new AppError(409, ERROR_CODES.CONFLICT, 'Board ini sudah Official');
  }
  const checklist = await boardChecklist(board, now);
  const warnings = presentChecklist(checklist)
    .filter((item) => !item.passed && item.key !== 'COMMUNITY')
    .map((item) => item.label);
  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.board.updateMany({
      where: { id: board.id, verification: 'COMMUNITY', status: { not: 'FROZEN' } },
      data: {
        verification: 'OFFICIAL',
        verifiedAt: now,
        verifiedById: admin.id,
        candidateSince: null,
      },
    });
    if (count === 0) throw new AppError(409, ERROR_CODES.CONFLICT, 'Status Board sudah berubah');
    await tx.boardVerificationLog.create({
      data: {
        boardId: board.id,
        action: 'GRANTED',
        actorUserId: admin.id,
        reason: note,
        snapshot: trustSnapshot(board),
      },
    });
    return tx.board.findUnique({ where: { id: board.id } });
  });
  await recordAudit('BOARD_VERIFIED', { actorId: admin.id, boardId: board.id, note, warnings });
  await notifyBoardVerified(updated);
  return {
    slug: updated.slug,
    verification: updated.verification,
    verifiedAt: updated.verifiedAt,
    warnings,
  };
}

export async function skipBoard(slug, admin, { note }, now = new Date()) {
  const board = await findBoard(slug);
  if (board.verification !== 'COMMUNITY') {
    throw new AppError(409, ERROR_CODES.CONFLICT, 'Hanya Board Komunitas yang bisa dilewati');
  }
  await prisma.boardVerificationLog.create({
    data: {
      boardId: board.id,
      action: 'SKIPPED',
      actorUserId: admin.id,
      reason: note || null,
      snapshot: trustSnapshot(board),
    },
  });
  await recordAudit('BOARD_VERIFICATION_SKIPPED', { actorId: admin.id, boardId: board.id, note });
  await recomputeBoardTrust(board.id, now);
  return {
    slug: board.slug,
    skippedUntil: new Date(now.getTime() + VERIFICATION_RULES.SKIP_COOLDOWN_DAYS * DAY_MS),
  };
}

export async function revokeVerification(slug, admin, { reason }, now = new Date()) {
  const board = await findBoard(slug);
  if (board.verification !== 'OFFICIAL') {
    throw new AppError(409, ERROR_CODES.CONFLICT, 'Board ini bukan Official');
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.board.update({
      where: { id: board.id },
      data: { verification: 'COMMUNITY', verifiedAt: null, verifiedById: null },
    });
    await tx.boardVerificationLog.create({
      data: {
        boardId: board.id,
        action: 'REVOKED',
        actorUserId: admin.id,
        reason,
        snapshot: trustSnapshot(board),
      },
    });
    return tx.board.findUnique({ where: { id: board.id } });
  });
  await recordAudit('BOARD_VERIFICATION_REVOKED', { actorId: admin.id, boardId: board.id, reason });
  await notifyBoardVerificationRevoked(updated, reason);
  await recomputeBoardTrust(board.id, now);
  return { slug: updated.slug, verification: 'COMMUNITY' };
}
