import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import {
  createBoardsRouter,
  createMeBoardsRouter,
  createMetaRouter,
} from './modules/boards/boards.routes.js';
import {
  createBoardReportsRouter,
  createFeedRouter,
  createMeReportsRouter,
  createReportsRouter,
  createTrackRouter,
} from './modules/reports/reports.routes.js';

import { createAdminRouter, createFlagsRouter } from './modules/moderation/moderation.routes.js';

export function createApiRouter() {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/auth', createAuthRouter());
  router.use('/boards', createBoardReportsRouter());
  router.use('/boards', createBoardsRouter());
  router.use('/reports', createReportsRouter());
  router.use('/track', createTrackRouter());
  router.use('/feed', createFeedRouter());
  router.use('/flags', createFlagsRouter());
  router.use('/admin', createAdminRouter());
  router.use('/me', createMeReportsRouter());
  router.use('/me', createMeBoardsRouter());
  router.use('/meta', createMetaRouter());

  return router;
}
