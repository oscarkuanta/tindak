import { prisma } from './prisma.js';
import { logger } from './logger.js';

function inferTarget(details) {
  if (details.targetType) return [details.targetType, details.targetId ?? null];
  if (details.reportId) return ['REPORT', details.reportId];
  if (details.boardId) return ['BOARD', details.boardId];
  if (details.banId) return ['BAN', details.banId];
  if (details.targetUserId) return ['USER', details.targetUserId];
  return [null, null];
}

export async function recordAudit(action, details = {}) {
  const { actorId = null, ...data } = details;
  const [targetType, targetId] = inferTarget(details);
  logger.info({ audit: { action, actorId, ...data } }, `Audit: ${action}`);
  try {
    await prisma.auditLog.create({
      data: { action, actorUserId: actorId, targetType, targetId, data },
    });
  } catch (error) {
    logger.error({ err: error, action }, 'Audit gagal disimpan');
  }
}
