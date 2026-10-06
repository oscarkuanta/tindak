import cron from 'node-cron';
import { AUTO_CONFIRM_AFTER_DAYS } from '@tindak/shared';
import { logger } from '../lib/logger.js';
import { autoConfirmReports } from '../modules/reports/handling.service.js';
import { markInactiveBoards } from '../modules/boards/boards.service.js';
import { refreshHotScores, refreshPriorityScores } from '../modules/engagement/scores.service.js';

export const JOB_SCHEDULES = Object.freeze({
  hourly: '7 * * * *',
  hot: '*/15 * * * *',
  daily: '20 0 * * *',
});

export async function runScheduledJobs(now = new Date()) {
  const autoConfirmed = await autoConfirmReports(now, AUTO_CONFIRM_AFTER_DAYS);
  const inactiveBoards = await markInactiveBoards(now);
  return { autoConfirmed, inactiveBoards };
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
    schedule(JOB_SCHEDULES.daily, 'prioritas', async () => ({
      priorityScores: await refreshPriorityScores(),
    })),
  ];
  logger.info('Job terjadwal aktif');
  return { stop: () => tasks.forEach((task) => task.stop()) };
}
