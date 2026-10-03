import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';

export function createApiRouter() {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/auth', createAuthRouter());

  return router;
}
