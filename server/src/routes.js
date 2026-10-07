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
import { createBoardAdminRouter, createBoardRatingsRouter } from './modules/trust/trust.routes.js';
import { createNotificationsRouter } from './modules/notifications/notifications.routes.js';
import { createBoardStatsRouter } from './modules/stats/stats.routes.js';

export function apiMounts() {
  return [
    ['/health', healthRouter],
    ['/auth', createAuthRouter()],
    ['/boards', createBoardReportsRouter()],
    ['/boards', createBoardRatingsRouter()],
    ['/boards', createBoardStatsRouter()],
    ['/boards', createBoardsRouter()],
    ['/reports', createReportsRouter()],
    ['/track', createTrackRouter()],
    ['/feed', createFeedRouter()],
    ['/flags', createFlagsRouter()],
    ['/admin', createAdminRouter()],
    ['/board-admin', createBoardAdminRouter()],
    ['/notifications', createNotificationsRouter()],
    ['/me', createMeReportsRouter()],
    ['/me', createMeBoardsRouter()],
    ['/meta', createMetaRouter()],
  ];
}

export function createApiRouter() {
  const router = Router();
  for (const [path, mounted] of apiMounts()) router.use(path, mounted);
  return router;
}
