import { Router } from 'express';
import { boardExportQuerySchema, boardStatsQuerySchema } from '@tindak/shared';
import { validate } from '../../middlewares/validate.js';
import { requireBoardRole } from '../../middlewares/boardAccess.js';
import { createRateLimiter } from '../../middlewares/rateLimit.js';
import { exportCsv, stats } from './stats.controller.js';

export function createBoardStatsRouter() {
  const router = Router();
  const boardStaff = requireBoardRole('OWNER', 'HANDLER');
  const exportLimiter = createRateLimiter({
    windowMs: 60_000,
    limit: 10,
    message: 'Terlalu sering mengekspor data. Coba lagi sebentar.',
  });

  router.get('/:slug/stats', boardStaff, validate(boardStatsQuerySchema, 'query'), stats);
  router.get(
    '/:slug/export',
    boardStaff,
    exportLimiter,
    validate(boardExportQuerySchema, 'query'),
    exportCsv,
  );
  return router;
}
