import { Router } from 'express';
import {
  boardReportsQuerySchema,
  boardSlugParamSchema,
  createReportRequestSchema,
  myReportsQuerySchema,
  reportIdParamSchema,
  trackReportParamSchema,
  trackReportQuerySchema,
} from '@tindak/shared';
import { validate } from '../../middlewares/validate.js';
import { optionalAuth, requireAuth } from '../../middlewares/auth.js';
import { guestToken } from '../../middlewares/guestToken.js';
import { reportPhotosUpload } from '../../middlewares/upload.js';
import { createRateLimiter } from '../../middlewares/rateLimit.js';
import { create, detail, listForBoard, mine, track } from './reports.controller.js';

export function createBoardReportsRouter() {
  const router = Router();
  const burstLimiter = createRateLimiter({
    windowMs: 60_000,
    limit: 10,
    message: 'Terlalu banyak percobaan mengirim laporan. Coba lagi sebentar.',
  });

  router.post(
    '/:slug/reports',
    optionalAuth,
    burstLimiter,
    guestToken,
    validate(boardSlugParamSchema, 'params'),
    reportPhotosUpload,
    validate(createReportRequestSchema),
    create,
  );
  router.get(
    '/:slug/reports',
    optionalAuth,
    validate(boardSlugParamSchema, 'params'),
    validate(boardReportsQuerySchema, 'query'),
    listForBoard,
  );
  return router;
}

export function createReportsRouter() {
  const router = Router();
  router.get('/:id', optionalAuth, validate(reportIdParamSchema, 'params'), detail);
  return router;
}

export function createTrackRouter() {
  const router = Router();
  const trackLimiter = createRateLimiter({
    windowMs: 15 * 60_000,
    limit: 60,
    message: 'Terlalu banyak percobaan melacak laporan. Coba lagi nanti.',
  });
  router.get(
    '/:code',
    trackLimiter,
    validate(trackReportParamSchema, 'params'),
    validate(trackReportQuerySchema, 'query'),
    track,
  );
  return router;
}

export function createMeReportsRouter() {
  const router = Router();
  router.get('/reports', requireAuth, validate(myReportsQuerySchema, 'query'), mine);
  return router;
}
