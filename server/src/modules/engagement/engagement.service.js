import { ERROR_CODES, REPORT_LOCKED_STATUSES } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { getBoardMembership } from '../boards/boards.service.js';
import { refreshReportScores } from './scores.service.js';

function notFound() {
  return new AppError(404, ERROR_CODES.REPORT_NOT_FOUND, 'Laporan tidak ditemukan');
}

async function loadEngageable(id, user) {
  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      boardId: true,
      userId: true,
      status: true,
      isHidden: true,
      board: { select: { status: true } },
    },
  });
  if (!report || report.board.status === 'FROZEN') throw notFound();
  if (report.isHidden && !(await getBoardMembership(report.boardId, user.id))) throw notFound();
  if (REPORT_LOCKED_STATUSES.includes(report.status)) {
    throw new AppError(
      409,
      ERROR_CODES.REPORT_LOCKED,
      'Laporan sudah ditutup sehingga dukungan dan reaksi dikunci',
    );
  }
  return report;
}

async function commit(report, user, change) {
  await prisma.$transaction(async (tx) => {
    await change(tx);
    await tx.report.update({ where: { id: report.id }, data: { lastEngagementAt: new Date() } });
    await refreshReportScores(tx, report.id);
  });
  return getEngagementState(report.id, user);
}

export async function getEngagementState(reportId, user) {
  const [report, support, reaction] = await Promise.all([
    prisma.report.findUnique({
      where: { id: reportId },
      select: {
        supportCount: true,
        dangerousCount: true,
        longStandingCount: true,
        annoyingCount: true,
        priorityScore: true,
      },
    }),
    prisma.support.findUnique({ where: { reportId_userId: { reportId, userId: user.id } } }),
    prisma.reaction.findUnique({ where: { reportId_userId: { reportId, userId: user.id } } }),
  ]);
  return {
    reportId,
    supportCount: report.supportCount,
    reactionCounts: {
      DANGEROUS: report.dangerousCount,
      LONG_STANDING: report.longStandingCount,
      ANNOYING: report.annoyingCount,
    },
    priorityScore: report.priorityScore,
    mySupport: Boolean(support),
    myReaction: reaction?.type ?? null,
  };
}

export async function supportReport(id, user) {
  const report = await loadEngageable(id, user);
  if (report.userId === user.id) {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      'Kamu pelapor laporan ini, dukunganmu sudah dihitung otomatis',
    );
  }
  return commit(report, user, (tx) =>
    tx.support.upsert({
      where: { reportId_userId: { reportId: report.id, userId: user.id } },
      create: { reportId: report.id, userId: user.id },
      update: {},
    }),
  );
}

export async function withdrawSupport(id, user) {
  const report = await loadEngageable(id, user);
  return commit(report, user, (tx) =>
    tx.support.deleteMany({ where: { reportId: report.id, userId: user.id } }),
  );
}

export async function reactToReport(id, user, { type }) {
  const report = await loadEngageable(id, user);
  return commit(report, user, (tx) =>
    tx.reaction.upsert({
      where: { reportId_userId: { reportId: report.id, userId: user.id } },
      create: { reportId: report.id, userId: user.id, type },
      update: { type },
    }),
  );
}

export async function removeReaction(id, user) {
  const report = await loadEngageable(id, user);
  return commit(report, user, (tx) =>
    tx.reaction.deleteMany({ where: { reportId: report.id, userId: user.id } }),
  );
}

export async function viewerEngagement(reportIds, user) {
  if (!user || reportIds.length === 0) return { supports: new Set(), reactions: new Map() };
  const [supports, reactions] = await Promise.all([
    prisma.support.findMany({
      where: { userId: user.id, reportId: { in: reportIds } },
      select: { reportId: true },
    }),
    prisma.reaction.findMany({
      where: { userId: user.id, reportId: { in: reportIds } },
      select: { reportId: true, type: true },
    }),
  ]);
  return {
    supports: new Set(supports.map((row) => row.reportId)),
    reactions: new Map(reactions.map((row) => [row.reportId, row.type])),
  };
}
