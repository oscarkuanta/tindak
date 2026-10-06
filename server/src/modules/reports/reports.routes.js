import { Router } from 'express';
import {
  boardReportsQuerySchema,
  boardSlugParamSchema,
  createReportRequestSchema,
  myReportsQuerySchema,
  reportIdParamSchema,
  trackReportParamSchema,
  trackReportQuerySchema,
  answerInfoRequestSchema,
  confirmReportRequestSchema,
  duplicateReportRequestSchema,
  processReportRequestSchema,
  rejectReportRequestSchema,
  reportQueueQuerySchema,
  requestInfoRequestSchema,
  resolveReportRequestSchema,
} from '@tindak/shared';
import { validate } from '../../middlewares/validate.js';
import { optionalAuth, requireAuth } from '../../middlewares/auth.js';
import { guestToken } from '../../middlewares/guestToken.js';
import { reportPhotosUpload } from '../../middlewares/upload.js';
import { createRateLimiter } from '../../middlewares/rateLimit.js';
import { create, detail, listForBoard, mine, track } from './reports.controller.js';
import { requireBoardRole } from '../../middlewares/boardAccess.js';
import {
  answer,
  askInfo,
  confirm,
  duplicate,
  processAction,
  queue,
  reject,
  resolve,
} from './handling.controller.js';

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
  router.get(
    '/:slug/queue',
    requireBoardRole('OWNER', 'HANDLER'),
    validate(reportQueueQuerySchema, 'query'),
    queue,
  );
  return router;
}

export function createReportsRouter() {
  const router = Router();
  const idParams = validate(reportIdParamSchema, 'params');
  const reporterLimiter = createRateLimiter({
    windowMs: 15 * 60_000,
    limit: 30,
    message: 'Terlalu banyak percobaan. Coba lagi nanti.',
  });

  router.get('/:id', optionalAuth, idParams, detail);
  router.post(
    '/:id/process',
    requireAuth,
    idParams,
    validate(processReportRequestSchema),
    processAction,
  );
  router.post(
    '/:id/request-info',
    requireAuth,
    idParams,
    validate(requestInfoRequestSchema),
    askInfo,
  );
  router.post('/:id/reject', requireAuth, idParams, validate(rejectReportRequestSchema), reject);
  router.post(
    '/:id/duplicate',
    requireAuth,
    idParams,
    validate(duplicateReportRequestSchema),
    duplicate,
  );
  router.post(
    '/:id/resolve',
    requireAuth,
    idParams,
    reportPhotosUpload,
    validate(resolveReportRequestSchema),
    resolve,
  );
  router.post(
    '/:id/answer-info',
    optionalAuth,
    reporterLimiter,
    idParams,
    validate(answerInfoRequestSchema),
    answer,
  );
  router.post(
    '/:id/confirm',
    optionalAuth,
    reporterLimiter,
    idParams,
    reportPhotosUpload,
    validate(confirmReportRequestSchema),
    confirm,
  );
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
