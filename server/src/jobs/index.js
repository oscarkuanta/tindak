import cron from 'node-cron';
import { AUTO_CONFIRM_AFTER_DAYS, DUE_WARNING_HOURS } from '@tindak/shared';
import { logger } from '../lib/logger.js';
import { autoConfirmReports } from '../modules/reports/handling.service.js';
import { markInactiveBoards } from '../modules/boards/boards.service.js';
import { purgeOldIpHashes } from '../modules/moderation/admin.service.js';
import { recomputeAllBoardTrust } from '../modules/trust/trust.service.js';
import { notifyDueSoon, sendRatingDigest } from '../modules/notifications/notify.service.js';
import { refreshHotScores, refreshPriorityScores } from '../modules/engagement/scores.service.js';

export const JOB_SCHEDULES = Object.freeze({
  hourly: '7 * * * *',
  hot: '*/15 * * * *',
  daily: '20 0 * * *',
});

export async function runScheduledJobs(now = new Date()) {
  const autoConfirmed = await autoConfirmReports(now, AUTO_CONFIRM_AFTER_DAYS);
  const inactiveBoards = await markInactiveBoards(now);
  const dueWarnings = await notifyDueSoon(now, DUE_WARNING_HOURS);
  return { autoConfirmed, inactiveBoards, dueWarnings };
}

export async function runEngagementJobs(now = new Date()) {
  const hotScores = await refreshHotScores(now);
  const priorityScores = await refreshPriorityScores(now);
  return { hotScores, priorityScores };
}

function schedule(expression, name, job) {
  return cron.schedule(expression, async () => {
    try {
      logger.info({ jobs: await job() }, `Job ${name} selesai`);
    } catch (error) {
      logger.error({ err: error }, `Job ${name} gagal`);
    }
  });
}

export function startJobs() {
  const tasks = [
    schedule(JOB_SCHEDULES.hourly, 'status', () => runScheduledJobs()),
    schedule(JOB_SCHEDULES.hot, 'hot', async () => ({ hotScores: await refreshHotScores() })),
    schedule(JOB_SCHEDULES.daily, 'harian', async () => ({
      priorityScores: await refreshPriorityScores(),
      purgedIpHashes: await purgeOldIpHashes(),
      trustScores: await recomputeAllBoardTrust(),
      ratingDigests: await sendRatingDigest(),
    })),
  ];
  logger.info('Job terjadwal aktif');
  return { stop: () => tasks.forEach((task) => task.stop()) };
}
