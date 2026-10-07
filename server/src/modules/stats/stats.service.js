import {
  REPORT_ACTIVE_STATUSES,
  REPORT_STATUSES,
  STATS_LATE_LIST_LIMIT,
  STATS_LIST_LIMIT,
  STATS_RANGES,
  STATS_TIMEZONE_OFFSET_HOURS,
} from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { ratingDistribution, toTrustSummary } from '../trust/ratings.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const TZ_MS = STATS_TIMEZONE_OFFSET_HOURS * HOUR_MS;

const num = (value) => (value === null || value === undefined ? null : Number(value));
const toHours = (seconds) => (seconds === null ? null : Math.round((seconds / 3600) * 10) / 10);
const percent = (part, total) => (total ? Math.round((part / total) * 100) : null);

export function rangeStart(range, now = new Date()) {
  return new Date(now.getTime() - STATS_RANGES[range] * DAY_MS);
}

export function weekStartOf(date) {
  const local = new Date(new Date(date).getTime() + TZ_MS);
  const weekday = (local.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - weekday),
  )
    .toISOString()
    .slice(0, 10);
}

export function weeksBetween(since, now) {
  const weeks = [];
  let cursor = new Date(`${weekStartOf(since)}T00:00:00.000Z`);
  const last = weekStartOf(now);
  while (cursor.toISOString().slice(0, 10) <= last) {
    weeks.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 7 * DAY_MS);
  }
  return weeks;
}

async function statusCounts(boardId, since) {
  const rows = await prisma.report.groupBy({
    by: ['status'],
    where: { boardId, removedAt: null, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(REPORT_STATUSES.map((status) => [status, 0]));
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

async function handlingTime(boardId, since) {
  const [row] = await prisma.$queryRaw`
    SELECT COUNT(*) AS handled,
           AVG(TIMESTAMPDIFF(SECOND, r.created_at, e.first_at)) AS avg_seconds
    FROM reports r
    JOIN (
      SELECT report_id, MIN(created_at) AS first_at
      FROM report_events
      WHERE to_status = 'AWAITING_CONFIRMATION'
      GROUP BY report_id
    ) e ON e.report_id = r.id
    WHERE r.board_id = ${boardId} AND r.removed_at IS NULL AND r.created_at >= ${since}`;
  return { handledCount: num(row.handled), averageHours: toHours(num(row.avg_seconds)) };
}

async function responseRate(boardId, since, now) {
  const windowStart = new Date(now.getTime() - 7 * DAY_MS);
  const [row] = await prisma.$queryRaw`
    SELECT
      SUM(CASE WHEN t.first_at IS NOT NULL OR r.created_at <= ${windowStart} THEN 1 ELSE 0 END)
        AS eligible,
      SUM(CASE WHEN t.first_at IS NOT NULL
               AND t.first_at <= DATE_ADD(r.created_at, INTERVAL 7 DAY) THEN 1 ELSE 0 END)
        AS responded
    FROM reports r
    LEFT JOIN (
      SELECT report_id, MIN(created_at) AS first_at
      FROM report_events
      WHERE from_status = 'NEW'
      GROUP BY report_id
    ) t ON t.report_id = r.id
    WHERE r.board_id = ${boardId} AND r.removed_at IS NULL AND r.created_at >= ${since}`;
  return percent(num(row.responded) ?? 0, num(row.eligible) ?? 0);
}

async function dangerousStats(boardId, since, now) {
  const [summary] = await prisma.$queryRaw`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN e.first_at IS NOT NULL AND e.first_at <= r.due_at THEN 1 ELSE 0 END)
             AS on_time
    FROM reports r
    LEFT JOIN (
      SELECT report_id, MIN(created_at) AS first_at
      FROM report_events
      WHERE to_status = 'AWAITING_CONFIRMATION'
      GROUP BY report_id
    ) e ON e.report_id = r.id
    WHERE r.board_id = ${boardId} AND r.removed_at IS NULL AND r.created_at >= ${since}
      AND r.severity = 'DANGEROUS' AND r.due_at IS NOT NULL
      AND r.status NOT IN ('REJECTED', 'DUPLICATE')
      AND (e.first_at IS NOT NULL OR r.due_at < ${now})`;
  const late = await prisma.$queryRaw`
    SELECT r.id, r.title, r.status, r.due_at, r.created_at, e.first_at
    FROM reports r
    LEFT JOIN (
      SELECT report_id, MIN(created_at) AS first_at
      FROM report_events
      WHERE to_status = 'AWAITING_CONFIRMATION'
      GROUP BY report_id
    ) e ON e.report_id = r.id
    WHERE r.board_id = ${boardId} AND r.removed_at IS NULL AND r.created_at >= ${since}
      AND r.severity = 'DANGEROUS' AND r.due_at IS NOT NULL
      AND r.status NOT IN ('REJECTED', 'DUPLICATE')
      AND ((e.first_at IS NOT NULL AND e.first_at > r.due_at)
        OR (e.first_at IS NULL AND r.due_at < ${now}))
    ORDER BY r.due_at ASC, r.id ASC
    LIMIT ${STATS_LATE_LIST_LIMIT}`;
  const total = num(summary.total);
  const onTime = num(summary.on_time) ?? 0;
  return {
    total,
    onTime,
    late: total - onTime,
    onTimeRate: percent(onTime, total),
    lateReports: late.map((row) => {
      const finishedAt = row.first_at ? new Date(row.first_at) : null;
      const until = finishedAt ?? now;
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        createdAt: new Date(row.created_at),
        dueAt: new Date(row.due_at),
        markedResolvedAt: finishedAt,
        lateHours: Math.round(((until - new Date(row.due_at)) / HOUR_MS) * 10) / 10,
      };
    }),
  };
}

async function categoryCounts(boardId, since) {
  const [categories, rows] = await Promise.all([
    prisma.category.findMany({
      where: { boardId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    }),
    prisma.report.groupBy({
      by: ['categoryId'],
      where: { boardId, removedAt: null, createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);
  const counts = new Map(rows.map((row) => [row.categoryId, row._count._all]));
  return categories
    .map((category) => ({ ...category, count: counts.get(category.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

async function weeklyTrend(boardId, since, now) {
  const offset = STATS_TIMEZONE_OFFSET_HOURS;
  const [incoming, resolved] = await Promise.all([
    prisma.$queryRaw`
      SELECT DATE_FORMAT(
               DATE_SUB(DATE(DATE_ADD(r.created_at, INTERVAL ${offset} HOUR)),
                        INTERVAL WEEKDAY(DATE_ADD(r.created_at, INTERVAL ${offset} HOUR)) DAY),
               '%Y-%m-%d') AS week,
             COUNT(*) AS total
      FROM reports r
      WHERE r.board_id = ${boardId} AND r.removed_at IS NULL AND r.created_at >= ${since}
      GROUP BY week`,
    prisma.$queryRaw`
      SELECT DATE_FORMAT(
               DATE_SUB(DATE(DATE_ADD(e.first_at, INTERVAL ${offset} HOUR)),
                        INTERVAL WEEKDAY(DATE_ADD(e.first_at, INTERVAL ${offset} HOUR)) DAY),
               '%Y-%m-%d') AS week,
             COUNT(*) AS total
      FROM reports r
      JOIN (
        SELECT report_id, MIN(created_at) AS first_at
        FROM report_events
        WHERE to_status = 'RESOLVED'
        GROUP BY report_id
      ) e ON e.report_id = r.id
      WHERE r.board_id = ${boardId} AND r.removed_at IS NULL AND e.first_at >= ${since}
      GROUP BY week`,
  ]);
  const incomingByWeek = new Map(incoming.map((row) => [row.week, num(row.total)]));
  const resolvedByWeek = new Map(resolved.map((row) => [row.week, num(row.total)]));
  return weeksBetween(since, now).map((weekStart) => ({
    weekStart,
    incoming: incomingByWeek.get(weekStart) ?? 0,
    resolved: resolvedByWeek.get(weekStart) ?? 0,
  }));
}

async function oldestActive(boardId, now) {
  const reports = await prisma.report.findMany({
    where: { boardId, removedAt: null, status: { in: [...REPORT_ACTIVE_STATUSES] } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: STATS_LIST_LIMIT,
    select: {
      id: true,
      title: true,
      status: true,
      severity: true,
      createdAt: true,
      dueAt: true,
      category: { select: { id: true, name: true } },
    },
  });
  return reports.map((report) => ({
    ...report,
    ageDays: Math.floor((now - report.createdAt) / DAY_MS),
  }));
}

async function handlerPerformance(boardId, since) {
  const [members, rows] = await Promise.all([
    prisma.boardMember.findMany({
      where: { boardId, status: 'ACTIVE' },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.$queryRaw`
      SELECT e.actor_id,
             SUM(CASE WHEN e.to_status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS processed,
             SUM(CASE WHEN e.to_status = 'AWAITING_CONFIRMATION' THEN 1 ELSE 0 END) AS resolved,
             AVG(CASE WHEN e.to_status = 'AWAITING_CONFIRMATION'
                      THEN TIMESTAMPDIFF(SECOND, r.created_at, e.created_at) END) AS avg_seconds
      FROM report_events e
      JOIN reports r ON r.id = e.report_id
      WHERE r.board_id = ${boardId} AND r.removed_at IS NULL
        AND e.actor_type = 'HANDLER' AND e.actor_id IS NOT NULL AND e.created_at >= ${since}
      GROUP BY e.actor_id`,
  ]);
  const byUser = new Map(rows.map((row) => [Number(row.actor_id), row]));
  return members
    .map((member) => {
      const row = byUser.get(member.userId);
      return {
        userId: member.userId,
        name: member.user.name,
        role: member.role,
        processed: num(row?.processed) ?? 0,
        resolved: num(row?.resolved) ?? 0,
        averageHours: toHours(num(row?.avg_seconds)),
      };
    })
    .sort((a, b) => b.resolved - a.resolved || b.processed - a.processed);
}

async function ratingSummary(board, since) {
  const [distribution, newRatings] = await Promise.all([
    ratingDistribution(board.id),
    prisma.boardRating.count({ where: { boardId: board.id, createdAt: { gte: since } } }),
  ]);
  return { ...toTrustSummary(board), ...distribution, newRatings };
}

export async function getBoardStats(board, membership, { range }, now = new Date()) {
  const since = rangeStart(range, now);
  const isOwner = membership.role === 'OWNER';
  const [statuses, handling, response, dangerous, categories, trend, oldest, handlers, rating] =
    await Promise.all([
      statusCounts(board.id, since),
      handlingTime(board.id, since),
      responseRate(board.id, since, now),
      dangerousStats(board.id, since, now),
      categoryCounts(board.id, since),
      weeklyTrend(board.id, since, now),
      oldestActive(board.id, now),
      isOwner ? handlerPerformance(board.id, since) : null,
      ratingSummary(board, since),
    ]);
  const total = Object.values(statuses).reduce((sum, count) => sum + count, 0);
  return {
    range,
    since,
    generatedAt: now,
    totals: {
      total,
      active: REPORT_ACTIVE_STATUSES.reduce((sum, status) => sum + statuses[status], 0),
      resolved: statuses.RESOLVED,
      rejected: statuses.REJECTED,
    },
    statusCounts: statuses,
    handling,
    responseRate: response,
    dangerous,
    categories,
    weeklyTrend: trend,
    oldestActive: oldest,
    handlers,
    rating,
  };
}
