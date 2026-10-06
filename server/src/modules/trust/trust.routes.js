import { Router } from 'express';
import {
  boardSlugParamSchema,
  candidatesQuerySchema,
  officialBoardsQuerySchema,
  ratingRequestSchema,
  revokeVerificationRequestSchema,
  skipBoardRequestSchema,
  verifyBoardRequestSchema,
} from '@tindak/shared';
import { validate } from '../../middlewares/validate.js';
import { optionalAuth, requireAuth, requireBoardAdmin } from '../../middlewares/auth.js';
import { rejectBanned } from '../../middlewares/rejectBanned.js';
import { createRateLimiter } from '../../middlewares/rateLimit.js';
import {
  boardAdminStats,
  candidates,
  myRating,
  officialBoards,
  rate,
  ratingSummary,
  revoke,
  skip,
  verificationDetail,
  verify,
} from './trust.controller.js';

export function createBoardRatingsRouter() {
  const router = Router();
  const slugParams = validate(boardSlugParamSchema, 'params');
  const limiter = createRateLimiter({
    windowMs: 60_000,
    limit: 20,
    message: 'Terlalu sering mengubah rating. Coba lagi sebentar.',
  });

  router.put(
    '/:slug/rating',
    requireAuth,
    limiter,
    slugParams,
    rejectBanned,
    validate(ratingRequestSchema),
    rate,
  );
  router.get('/:slug/rating/me', optionalAuth, slugParams, myRating);
  router.get('/:slug/ratings/summary', optionalAuth, slugParams, ratingSummary);
  return router;
}

export function createBoardAdminRouter() {
  const router = Router();
  const slugParams = validate(boardSlugParamSchema, 'params');

  router.use(requireBoardAdmin);
  router.get('/stats', boardAdminStats);
  router.get('/candidates', validate(candidatesQuerySchema, 'query'), candidates);
  router.get('/official', validate(officialBoardsQuerySchema, 'query'), officialBoards);
  router.get('/boards/:slug', slugParams, verificationDetail);
  router.post('/boards/:slug/verify', slugParams, validate(verifyBoardRequestSchema), verify);
  router.post('/boards/:slug/skip', slugParams, validate(skipBoardRequestSchema), skip);
  router.post(
    '/boards/:slug/revoke',
    slugParams,
    validate(revokeVerificationRequestSchema),
    revoke,
  );
  return router;
}
