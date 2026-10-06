import cron from 'node-cron';
import { AUTO_CONFIRM_AFTER_DAYS } from '@tindak/shared';
import { logger } from '../lib/logger.js';
import { autoConfirmReports } from '../modules/reports/handling.service.js';
import { markInactiveBoards } from '../modules/boards/boards.service.js';

export const JOB_SCHEDULE = '7 * * * *';

export async function runScheduledJobs(now = new Date()) {
  const autoConfirmed = await autoConfirmReports(now, AUTO_CONFIRM_AFTER_DAYS);
  const inactiveBoards = await markInactiveBoards(now);
  return { autoConfirmed, inactiveBoards };
}

export function startJobs() {
  const task = cron.schedule(JOB_SCHEDULE, async () => {
    try {
      const result = await runScheduledJobs();
      logger.info({ jobs: result }, 'Job terjadwal selesai');
    } catch (error) {
      logger.error({ err: error }, 'Job terjadwal gagal');
    }
  });
  logger.info(`Job terjadwal aktif (${JOB_SCHEDULE})`);
  return task;
}
