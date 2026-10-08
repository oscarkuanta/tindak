import {
  BAN_DURATIONS,
  FREEZE_DURATIONS,
  ERROR_CODES,
  FLAG_REASON_ORDER,
  REPORT_ACTIVE_STATUSES,
  USER_ROLES,
} from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { recordAudit } from '../../lib/audit.js';
import { activeBanWhere } from '../../lib/bans.js';
import { AppError } from '../../utils/AppError.js';
import { recomputeBoardTrust, trustSnapshot } from '../trust/trust.service.js';
import {
  notifyReportModerated,
  publishBoardUpdated,
  publishReportUpdated,
} from '../notifications/notify.service.js';
import { notifyBoardVerificationRevoked } from '../notifications/notifications.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function maskHash(hash) {
  if (!hash) return null;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function pageMeta(page, pageSize, total) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

function reportNotFound() {
  return new AppError(404, ERROR_CODES.REPORT_NOT_FOUND, 'Laporan tidak ditemukan');
}

function boardNotFound() {
  return new AppError(404, ERROR_CODES.BOARD_NOT_FOUND, 'Board tidak ditemukan');
}

export async function getStats(now = new Date()) {
  const [
    users,
    boardsByStatus,
    officialBoards,
    reportsByStatus,
    hiddenReports,
    removedReports,
    openFlags,
    activeBans,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.board.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.board.count({ where: { verification: 'OFFICIAL' } }),
    prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.report.count({ where: { isHidden: true, removedAt: null } }),
    prisma.report.count({ where: { removedAt: { not: null } } }),
    prisma.flag.findMany({
      where: { status: 'OPEN' },
      select: { targetType: true, targetId: true },
    }),
    prisma.ban.count({ where: activeBanWhere(now) }),
  ]);
  const boardStatus = Object.fromEntries(
    boardsByStatus.map((row) => [row.status, row._count._all]),
  );
  const reportStatus = Object.fromEntries(
    reportsByStatus.map((row) => [row.status, row._count._all]),
  );
  const reportTotal = Object.values(reportStatus).reduce((sum, count) => sum + count, 0);
  return {
    users: { total: users },
    boards: {
      total: Object.values(boardStatus).reduce((sum, count) => sum + count, 0),
      active: boardStatus.ACTIVE ?? 0,
      inactive: boardStatus.INACTIVE ?? 0,
      frozen: boardStatus.FROZEN ?? 0,
      official: officialBoards,
    },
    reports: {
      total: reportTotal,
      active: REPORT_ACTIVE_STATUSES.reduce((sum, status) => sum + (reportStatus[status] ?? 0), 0),
      resolved: reportStatus.RESOLVED ?? 0,
      hidden: hiddenReports,
      removed: removedReports,
    },
    moderation: {
      openFlags: openFlags.length,
      openTargets: new Set(openFlags.map((flag) => `${flag.targetType}:${flag.targetId}`)).size,
    },
    bans: { active: activeBans },
  };
}

function groupFlags(flags) {
  const groups = new Map();
  for (const flag of flags) {
    const key = `${flag.targetType}:${flag.targetId}`;
    if (!groups.has(key)) {
      groups.set(key, { targetType: flag.targetType, targetId: flag.targetId, flags: [] });
    }
    groups.get(key).flags.push(flag);
  }
  return [...groups.values()].map((group) => {
    const ranks = group.flags.map((flag) => FLAG_REASON_ORDER.indexOf(flag.reason));
    const worstRank = Math.min(...ranks);
    return {
      ...group,
      worstReason: FLAG_REASON_ORDER[worstRank],
      worstRank,
      reasons: [...new Set(group.flags.map((flag) => flag.reason))],
      flagCount: group.flags.length,
      totalWeight: group.flags.reduce((sum, flag) => sum + flag.weight, 0),
      firstFlaggedAt: group.flags.reduce(
        (first, flag) => (flag.createdAt < first ? flag.createdAt : first),
        group.flags[0].createdAt,
      ),
    };
  });
}

function compareGroups(a, b) {
  return (
    a.worstRank - b.worstRank || b.flagCount - a.flagCount || a.firstFlaggedAt - b.firstFlaggedAt
  );
}

async function sourceHistory(report, now) {
  const sources = [
    report.userId && { userId: report.userId },
    report.guestTokenHash && { guestTokenHash: report.guestTokenHash },
    report.ipHash && { ipHash: report.ipHash },
  ].filter(Boolean);
  const banTargets = [
    report.userId && { targetType: 'USER', targetValue: String(report.userId) },
    report.guestTokenHash && { targetType: 'GUEST_TOKEN', targetValue: report.guestTokenHash },
    report.ipHash && { targetType: 'IP', targetValue: report.ipHash },
  ].filter(Boolean);
  const [totalReports, removedReports, hiddenReports, bans] = await Promise.all([
    sources.length ? prisma.report.count({ where: { OR: sources } }) : 0,
    sources.length ? prisma.report.count({ where: { OR: sources, removedAt: { not: null } } }) : 0,
    sources.length
      ? prisma.report.count({ where: { OR: sources, isHidden: true, removedAt: null } })
      : 0,
    banTargets.length
      ? prisma.ban.findMany({
          where: { OR: banTargets },
          orderBy: { createdAt: 'desc' },
          select: { id: true, targetType: true, expiresAt: true, revokedAt: true, createdAt: true },
        })
      : [],
  ]);
  return {
    totalReports,
    removedReports,
    hiddenReports,
    bans: bans.map((ban) => ({
      ...ban,
      isActive: !ban.revokedAt && (!ban.expiresAt || ban.expiresAt > now),
    })),
  };
}

async function presentReportTarget(reportId, now) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      board: { select: { id: true, slug: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
      media: { orderBy: { id: 'asc' } },
    },
  });
  if (!report) return null;
  return {
    id: report.id,
    title: report.title,
    description: report.description,
    locationDetail: report.locationDetail,
    status: report.status,
    severity: report.severity,
    isHidden: report.isHidden,
    hiddenReason: report.hiddenReason,
    hiddenByHandler: report.hiddenByHandler,
    removedAt: report.removedAt,
    createdAt: report.createdAt,
    board: report.board,
    media: report.media.map((item) => ({
      id: item.id,
      url: item.url,
      kind: item.kind,
      isBlurred: item.isBlurred,
      nsfwScore: item.nsfwScore,
    })),
    reporterType: report.userId ? 'ACCOUNT' : 'GUEST',
    reporter: report.user,
    isAnonymous: report.isAnonymous,
    ipHashMasked: maskHash(report.ipHash),
    guestTokenMasked: maskHash(report.guestTokenHash),
    history: await sourceHistory(report, now),
  };
}

async function presentBoardTarget(boardId) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  if (!board) return null;
  return {
    id: board.id,
    slug: board.slug,
    name: board.name,
    city: board.city,
    status: board.status,
    verification: board.verification,
    managerTitle: board.managerTitle,
    restoredByAdminCount: board.restoredByAdminCount,
    owner: board.owner,
  };
}

export async function listModerationQueue({ status, reason, targetType, page, pageSize }) {
  const now = new Date();
  const flags = await prisma.flag.findMany({
    where: { status, ...(reason && { reason }), ...(targetType && { targetType }) },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const groups = groupFlags(flags).sort(compareGroups);
  const slice = groups.slice((page - 1) * pageSize, page * pageSize);
  const data = [];
  for (const group of slice) {
    data.push({
      targetType: group.targetType,
      targetId: group.targetId,
      worstReason: group.worstReason,
      reasons: group.reasons,
      flagCount: group.flagCount,
      totalWeight: group.totalWeight,
      firstFlaggedAt: group.firstFlaggedAt,
      flags: group.flags.map((flag) => ({
        id: flag.id,
        reason: flag.reason,
        note: flag.note,
        weight: flag.weight,
        status: flag.status,
        createdAt: flag.createdAt,
        flagger: flag.user,
      })),
      report: group.targetType === 'REPORT' ? await presentReportTarget(group.targetId, now) : null,
      board: group.targetType === 'BOARD' ? await presentBoardTarget(group.targetId) : null,
    });
  }
  return { data, meta: pageMeta(page, pageSize, groups.length) };
}

async function resolveFlags(tx, targetType, targetId, status) {
  await tx.flag.updateMany({
    where: { targetType, targetId, status: 'OPEN' },
    data: { status, resolvedAt: new Date() },
  });
}

export async function restoreReport(id, admin, { note } = {}) {
  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, boardId: true, hiddenByHandler: true, removedAt: true },
  });
  if (!report) throw reportNotFound();
  await prisma.$transaction(async (tx) => {
    await resolveFlags(tx, 'REPORT', id, 'REJECTED');
    await tx.report.update({
      where: { id },
      data: {
        isHidden: false,
        hiddenReason: null,
        hiddenByHandler: false,
        removedAt: null,
        needsModeration: false,
      },
    });
    if (report.hiddenByHandler) {
      await tx.board.update({
        where: { id: report.boardId },
        data: { restoredByAdminCount: { increment: 1 } },
      });
    }
  });
  await recomputeBoardTrust(report.boardId);
  await publishReportUpdated(id);
  await recordAudit('REPORT_RESTORED', {
    actorId: admin.id,
    reportId: id,
    note: note || null,
    wasHiddenByHandler: report.hiddenByHandler,
  });
  return presentReportTarget(id, new Date());
}

function expiryFor(duration, now) {
  const days = BAN_DURATIONS[duration];
  return days === null ? null : new Date(now.getTime() + days * DAY_MS);
}

async function banTargetValue({ targetType, reportId, userId }) {
  if (targetType === 'USER' && userId) return String(userId);
  const report = reportId
    ? await prisma.report.findUnique({
        where: { id: reportId },
        select: { userId: true, guestTokenHash: true, ipHash: true },
      })
    : null;
  if (!report) throw reportNotFound();
  const value = {
    USER: report.userId ? String(report.userId) : null,
    GUEST_TOKEN: report.guestTokenHash,
    IP: report.ipHash,
  }[targetType];
  if (!value) {
    const reason = {
      USER: 'Laporan ini dibuat tamu, pilih ban perangkat atau IP',
      GUEST_TOKEN: 'Laporan ini dibuat akun, pilih ban akun',
      IP: 'Data IP laporan ini sudah dihapus karena lebih dari 90 hari',
    }[targetType];
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, reason, [
      { field: 'targetType', message: reason },
    ]);
  }
  return value;
}

export async function createBan(admin, input, now = new Date()) {
  const targetValue = await banTargetValue(input);
  if (input.targetType === 'USER') {
    const target = await prisma.user.findUnique({
      where: { id: Number(targetValue) },
      select: { role: true },
    });
    if (!target) throw new AppError(404, ERROR_CODES.USER_NOT_FOUND, 'User tidak ditemukan');
    if (target.role === USER_ROLES.ADMIN) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Admin tidak bisa di-ban');
    }
  }
  const ban = await prisma.ban.create({
    data: {
      targetType: input.targetType,
      targetValue,
      reason: input.reason,
      expiresAt: expiryFor(input.duration, now),
      createdById: admin.id,
    },
  });
  if (input.targetType === 'USER') {
    await prisma.session.deleteMany({ where: { userId: Number(targetValue) } });
  }
  await recordAudit('BAN_CREATED', {
    actorId: admin.id,
    banId: ban.id,
    banTargetType: ban.targetType,
    duration: input.duration,
    reportId: input.reportId ?? null,
  });
  return presentBan(ban, now);
}

export async function removeReport(id, admin, { note, ban }) {
  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, boardId: true },
  });
  if (!report) throw reportNotFound();
  const createdBan = ban ? await createBan(admin, { ...ban, reportId: id }) : null;
  await prisma.$transaction(async (tx) => {
    await resolveFlags(tx, 'REPORT', id, 'ACCEPTED');
    await tx.report.update({
      where: { id },
      data: {
        isHidden: true,
        hiddenReason: 'ADMIN_REMOVED',
        removedAt: new Date(),
        needsModeration: false,
      },
    });
  });
  await recomputeBoardTrust(report.boardId);
  await notifyReportModerated(id, { removed: true, actorUserId: admin.id });
  await recordAudit('REPORT_REMOVED', {
    actorId: admin.id,
    reportId: id,
    note: note || null,
    banId: createdBan?.id ?? null,
  });
  return { report: await presentReportTarget(id, new Date()), ban: createdBan };
}

async function banTargetDisplay(ban) {
  if (ban.targetType !== 'USER') return maskHash(ban.targetValue);
  const user = await prisma.user.findUnique({
    where: { id: Number(ban.targetValue) },
    select: { name: true, email: true },
  });
  return user ? `${user.name} (${user.email})` : `User #${ban.targetValue}`;
}

async function presentBan(ban, now) {
  return {
    id: ban.id,
    targetType: ban.targetType,
    target: await banTargetDisplay(ban),
    reason: ban.reason,
    expiresAt: ban.expiresAt,
    createdAt: ban.createdAt,
    revokedAt: ban.revokedAt,
    createdBy: ban.createdBy ?? null,
    isActive: !ban.revokedAt && (!ban.expiresAt || ban.expiresAt > now),
  };
}

export async function listBans({ active, page, pageSize }, now = new Date()) {
  const where = active ? activeBanWhere(now) : {};
  const [total, rows] = await Promise.all([
    prisma.ban.count({ where }),
    prisma.ban.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const data = [];
  for (const ban of rows) data.push(await presentBan(ban, now));
  return { data, meta: pageMeta(page, pageSize, total) };
}

export async function revokeBan(id, admin) {
  const ban = await prisma.ban.findUnique({ where: { id } });
  if (!ban) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Ban tidak ditemukan');
  const updated = ban.revokedAt
    ? ban
    : await prisma.ban.update({ where: { id }, data: { revokedAt: new Date() } });
  await recordAudit('BAN_REVOKED', { actorId: admin.id, banId: id });
  return presentBan(updated, new Date());
}

export async function listAdminBoards({ q, status, page, pageSize }) {
  const where = { ...(q && { name: { contains: q } }), ...(status && { status }) };
  const [total, boards] = await Promise.all([
    prisma.board.count({ where }),
    prisma.board.findMany({
      where,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const ids = boards.map((board) => board.id);
  const [flags, reports] = await Promise.all([
    prisma.flag.groupBy({
      by: ['targetId', 'reason'],
      where: { targetType: 'BOARD', targetId: { in: ids }, status: 'OPEN' },
      _count: { _all: true },
    }),
    prisma.report.groupBy({
      by: ['boardId'],
      where: { boardId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  const reportCount = new Map(reports.map((row) => [row.boardId, row._count._all]));
  return {
    data: boards.map((board) => {
      const boardFlags = flags.filter((row) => row.targetId === board.id);
      return {
        id: board.id,
        slug: board.slug,
        name: board.name,
        city: board.city,
        type: board.type,
        status: board.status,
        verification: board.verification,
        verifiedAt: board.verifiedAt,
        restoredByAdminCount: board.restoredByAdminCount,
        frozenUntil: board.frozenUntil,
        owner: board.owner,
        reportCount: reportCount.get(board.id) ?? 0,
        openFlagCount: boardFlags.reduce((sum, row) => sum + row._count._all, 0),
        fakeBoardFlagCount: boardFlags
          .filter((row) => row.reason === 'FAKE_BOARD')
          .reduce((sum, row) => sum + row._count._all, 0),
        createdAt: board.createdAt,
      };
    }),
    meta: pageMeta(page, pageSize, total),
  };
}

async function findBoardBySlug(slug) {
  const board = await prisma.board.findUnique({ where: { slug } });
  if (!board) throw boardNotFound();
  return board;
}

export async function freezeBoard(slug, admin, { reason, duration }, now = new Date()) {
  const board = await findBoardBySlug(slug);
  if (board.status === 'FROZEN') {
    throw new AppError(409, ERROR_CODES.CONFLICT, 'Board sudah di-freeze');
  }
  const days = FREEZE_DURATIONS[duration];
  const frozenUntil = days === null ? null : new Date(now.getTime() + days * DAY_MS);
  const wasOfficial = board.verification === 'OFFICIAL';
  await prisma.$transaction(async (tx) => {
    await tx.board.update({
      where: { id: board.id },
      data: {
        status: 'FROZEN',
        frozenUntil,
        ...(wasOfficial && { verification: 'COMMUNITY', verifiedAt: null, verifiedById: null }),
      },
    });
    await resolveFlags(tx, 'BOARD', board.id, 'ACCEPTED');
    if (wasOfficial) {
      await tx.boardVerificationLog.create({
        data: {
          boardId: board.id,
          action: 'REVOKED',
          actorUserId: null,
          reason: 'Board di-freeze moderator',
          snapshot: trustSnapshot(board),
        },
      });
    }
  });
  await recomputeBoardTrust(board.id);
  await recordAudit('BOARD_FROZEN', {
    actorId: admin.id,
    boardId: board.id,
    reason,
    duration,
    frozenUntil,
  });
  const frozen = await prisma.board.findUnique({ where: { id: board.id } });
  if (wasOfficial) await notifyBoardVerificationRevoked(frozen, 'Board di-freeze moderator');
  else publishBoardUpdated(frozen);
  if (wasOfficial) {
    await recordAudit('BOARD_VERIFICATION_REVOKED_BY_FREEZE', {
      actorId: admin.id,
      boardId: board.id,
      previousVerifiedAt: board.verifiedAt,
      previousVerifiedById: board.verifiedById,
    });
  }
  return {
    slug: board.slug,
    status: 'FROZEN',
    frozenUntil,
    verification: 'COMMUNITY',
    verificationRevoked: wasOfficial,
  };
}

async function activateFrozenBoard(board, actorId, now) {
  const { count } = await prisma.board.updateMany({
    where: { id: board.id, status: 'FROZEN' },
    data: { status: 'ACTIVE', frozenUntil: null, lastHandlerActivityAt: now },
  });
  if (count === 0) return false;
  await recordAudit('BOARD_UNFROZEN', {
    actorId,
    boardId: board.id,
    automatic: actorId === null,
  });
  publishBoardUpdated(await recomputeBoardTrust(board.id, now));
  return true;
}

export async function unfreezeExpiredBoards(now = new Date()) {
  const boards = await prisma.board.findMany({
    where: { status: 'FROZEN', frozenUntil: { lte: now } },
    select: { id: true },
  });
  let unfrozen = 0;
  for (const board of boards) {
    if (await activateFrozenBoard(board, null, now)) unfrozen += 1;
  }
  return unfrozen;
}

export async function unfreezeBoard(slug, admin) {
  const board = await findBoardBySlug(slug);
  if (board.status !== 'FROZEN') {
    throw new AppError(409, ERROR_CODES.CONFLICT, 'Board tidak sedang di-freeze');
  }
  await activateFrozenBoard(board, admin.id, new Date());
  return { slug: board.slug, status: 'ACTIVE', verification: board.verification };
}

export async function dismissBoardFlags(slug, admin, { note } = {}) {
  const board = await findBoardBySlug(slug);
  await prisma.$transaction((tx) => resolveFlags(tx, 'BOARD', board.id, 'REJECTED'));
  await recomputeBoardTrust(board.id);
  await recordAudit('BOARD_FLAGS_DISMISSED', {
    actorId: admin.id,
    boardId: board.id,
    note: note || null,
  });
  return { slug: board.slug, dismissed: true };
}

export async function listUsers({ q, page, pageSize }, now = new Date()) {
  const where = q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { reports: true, flags: true } },
      },
    }),
  ]);
  const bans = await prisma.ban.findMany({
    where: {
      ...activeBanWhere(now),
      targetType: 'USER',
      targetValue: { in: users.map((user) => String(user.id)) },
    },
    select: { id: true, targetValue: true, expiresAt: true },
  });
  const banByUser = new Map(bans.map((ban) => [ban.targetValue, ban]));
  return {
    data: users.map(({ _count, ...user }) => ({
      ...user,
      reportCount: _count.reports,
      flagCount: _count.flags,
      activeBan: banByUser.get(String(user.id)) ?? null,
    })),
    meta: pageMeta(page, pageSize, total),
  };
}

export async function listAuditLogs({ action, actorUserId, targetType, page, pageSize }) {
  const where = {
    ...(action && { action }),
    ...(actorUserId && { actorUserId }),
    ...(targetType && { targetType }),
  };
  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      actor: row.actor,
      targetType: row.targetType,
      targetId: row.targetId,
      data: row.data,
      createdAt: row.createdAt,
    })),
    meta: pageMeta(page, pageSize, total),
  };
}

export async function purgeOldIpHashes(now = new Date(), retentionDays = 90) {
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
  const protectedHashes = await prisma.ban.findMany({
    where: { ...activeBanWhere(now), targetType: 'IP' },
    select: { targetValue: true },
  });
  const { count } = await prisma.report.updateMany({
    where: {
      createdAt: { lt: cutoff },
      ipHash: { not: null, notIn: protectedHashes.map((ban) => ban.targetValue) },
    },
    data: { ipHash: null },
  });
  return count;
}
