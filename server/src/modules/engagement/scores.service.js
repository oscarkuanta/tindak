import {
  REPORT_ACTIVE_STATUSES,
  REPORT_LOCKED_STATUSES,
  daysOpen,
  hotWindowStart,
  priorityScore,
} from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';

const REPORTER_SUPPORT = 1;

function closedAtOf(report, now) {
  if (!REPORT_LOCKED_STATUSES.includes(report.status)) return null;
  return report.resolvedAt ?? now;
}

export function scoreOf(report, counts, now = new Date()) {
  return priorityScore({
    ...counts,
    severity: report.severity,
    daysOpen: daysOpen(report.createdAt, closedAtOf(report, now), now),
  });
}

export async function refreshReportScores(client, reportId, now = new Date()) {
  const since = hotWindowStart(now);
  const [report, supports, reactions, recentSupports, recentReactions] = await Promise.all([
    client.report.findUnique({
      where: { id: reportId },
      select: { severity: true, status: true, createdAt: true, resolvedAt: true },
    }),
    client.support.count({ where: { reportId } }),
    client.reaction.groupBy({ by: ['type'], where: { reportId }, _count: { _all: true } }),
    client.support.count({ where: { reportId, createdAt: { gte: since } } }),
    client.reaction.count({ where: { reportId, updatedAt: { gte: since } } }),
  ]);
  const byType = Object.fromEntries(reactions.map((row) => [row.type, row._count._all]));
  const counts = {
    supportCount: supports + REPORTER_SUPPORT,
    dangerousCount: byType.DANGEROUS ?? 0,
    longStandingCount: byType.LONG_STANDING ?? 0,
    annoyingCount: byType.ANNOYING ?? 0,
  };
  return client.report.update({
    where: { id: reportId },
    data: {
      ...counts,
      hotScore: recentSupports + recentReactions,
      priorityScore: scoreOf(report, counts, now),
    },
  });
}

export async function refreshHotScores(now = new Date()) {
  const since = hotWindowStart(now);
  const [supports, reactions, stale] = await Promise.all([
    prisma.support.groupBy({
      by: ['reportId'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.reaction.groupBy({
      by: ['reportId'],
      where: { updatedAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.report.findMany({
      where: { hotScore: { gt: 0 } },
      select: { id: true, hotScore: true },
    }),
  ]);
  const fresh = new Map();
  for (const row of [...supports, ...reactions]) {
    fresh.set(row.reportId, (fresh.get(row.reportId) ?? 0) + row._count._all);
  }
  const current = new Map(stale.map((row) => [row.id, row.hotScore]));
  const ids = new Set([...fresh.keys(), ...current.keys()]);
  let changed = 0;
  for (const id of ids) {
    const next = fresh.get(id) ?? 0;
    if (next === (current.get(id) ?? 0)) continue;
    await prisma.report.update({ where: { id }, data: { hotScore: next } });
    changed += 1;
  }
  return changed;
}

export async function refreshPriorityScores(now = new Date()) {
  const reports = await prisma.report.findMany({
    where: { status: { in: [...REPORT_ACTIVE_STATUSES] } },
    select: {
      id: true,
      severity: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      priorityScore: true,
      supportCount: true,
      dangerousCount: true,
      longStandingCount: true,
      annoyingCount: true,
    },
  });
  let changed = 0;
  for (const report of reports) {
    const next = scoreOf(report, report, now);
    if (next === report.priorityScore) continue;
    await prisma.report.update({ where: { id: report.id }, data: { priorityScore: next } });
    changed += 1;
  }
  return changed;
}
