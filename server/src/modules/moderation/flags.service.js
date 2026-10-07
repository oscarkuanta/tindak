import { ERROR_CODES, FLAG_REASON_META, MODERATION_RULES } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { recordAudit } from '../../lib/audit.js';
import { AppError } from '../../utils/AppError.js';
import { getBoardMembership } from '../boards/boards.service.js';
import { recomputeBoardTrust } from '../trust/trust.service.js';
import { notifyReportModerated } from '../notifications/notify.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function targetNotFound() {
  return new AppError(
    404,
    ERROR_CODES.FLAG_TARGET_NOT_FOUND,
    'Konten yang ditandai tidak ditemukan',
  );
}

export async function openFakeBoardFlagCount(boardId, client = prisma) {
  return client.flag.count({
    where: { targetType: 'BOARD', targetId: boardId, reason: 'FAKE_BOARD', status: 'OPEN' },
  });
}

export async function flagWeightFor(userId, now = new Date()) {
  const rejected = await prisma.flag.count({
    where: {
      userId,
      status: 'REJECTED',
      resolvedAt: { gte: new Date(now.getTime() - MODERATION_RULES.ABUSER_WINDOW_DAYS * DAY_MS) },
    },
  });
  return rejected >= MODERATION_RULES.ABUSER_REJECTED_FLAGS ? 0 : 1;
}

export function hideDecision(flags, { flaggedByHandler = false } = {}) {
  let severe = 0;
  let other = 0;
  for (const flag of flags) {
    if (flag.reason === 'SYSTEM_NSFW') continue;
    if (FLAG_REASON_META[flag.reason]?.severe) severe += flag.weight;
    else other += flag.weight;
  }
  if (flaggedByHandler) return 'HANDLER_FLAG';
  if (severe >= MODERATION_RULES.SEVERE_HIDE_WEIGHT) return 'FLAGS';
  if (other >= MODERATION_RULES.OTHER_HIDE_WEIGHT) return 'FLAGS';
  return null;
}

async function loadTarget(targetType, targetId) {
  if (targetType === 'REPORT') {
    const report = await prisma.report.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        boardId: true,
        isHidden: true,
        removedAt: true,
        board: { select: { status: true } },
      },
    });
    if (!report || report.removedAt || report.board.status === 'FROZEN') throw targetNotFound();
    return report;
  }
  const board = await prisma.board.findUnique({
    where: { id: targetId },
    select: { id: true, status: true },
  });
  if (!board || board.status === 'FROZEN') throw targetNotFound();
  return board;
}

async function assertDailyLimit(userId, now) {
  const recent = await prisma.flag.count({
    where: { userId, createdAt: { gt: new Date(now.getTime() - DAY_MS) } },
  });
  if (recent >= MODERATION_RULES.FLAGS_PER_DAY) {
    throw new AppError(
      429,
      ERROR_CODES.RATE_LIMITED,
      `Batas ${MODERATION_RULES.FLAGS_PER_DAY} tanda pelanggaran per hari sudah tercapai`,
    );
  }
}

async function maybeHideReport(report, flaggerId, weight) {
  const flaggedByHandler =
    weight > 0 && Boolean(await getBoardMembership(report.boardId, flaggerId));
  if (report.isHidden) return null;
  const flags = await prisma.flag.findMany({
    where: { targetType: 'REPORT', targetId: report.id, status: 'OPEN' },
    select: { reason: true, weight: true },
  });
  const reason = hideDecision(flags, { flaggedByHandler });
  if (!reason) return null;
  const { count } = await prisma.report.updateMany({
    where: { id: report.id, isHidden: false },
    data: { isHidden: true, hiddenReason: reason, hiddenByHandler: reason === 'HANDLER_FLAG' },
  });
  if (count > 0) {
    await notifyReportModerated(report.id, {
      actorUserId: reason === 'HANDLER_FLAG' ? flaggerId : null,
    });
    await recordAudit('REPORT_AUTO_HIDDEN', {
      actorId: reason === 'HANDLER_FLAG' ? flaggerId : null,
      reportId: report.id,
      hiddenReason: reason,
    });
  }
  return reason;
}

export async function createFlag(user, { targetType, targetId, reason, note }, now = new Date()) {
  const target = await loadTarget(targetType, targetId);
  await assertDailyLimit(user.id, now);
  const weight = await flagWeightFor(user.id, now);

  let flag;
  try {
    flag = await prisma.flag.create({
      data: { targetType, targetId, userId: user.id, reason, note: note || null, weight },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new AppError(409, ERROR_CODES.ALREADY_FLAGGED, 'Kamu sudah menandai konten ini');
    }
    throw error;
  }

  const hidden = targetType === 'REPORT' ? await maybeHideReport(target, user.id, weight) : null;
  if (targetType === 'BOARD' && reason === 'FAKE_BOARD') await recomputeBoardTrust(target.id);
  return {
    id: flag.id,
    targetType,
    targetId,
    reason,
    status: flag.status,
    hidden: Boolean(hidden),
  };
}
