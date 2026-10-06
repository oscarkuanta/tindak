import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import {
  createBoardsRouter,
  createMeBoardsRouter,
  createMetaRouter,
} from './modules/boards/boards.routes.js';

export function createApiRouter() {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/auth', createAuthRouter());
  router.use('/boards', createBoardsRouter());
  router.use('/me', createMeBoardsRouter());
  router.use('/meta', createMetaRouter());

  return router;
}
