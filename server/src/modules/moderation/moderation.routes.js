import { Router } from 'express';
import {
  adminBansQuerySchema,
  adminBoardsQuerySchema,
  adminListQuerySchema,
  auditLogQuerySchema,
  boardSlugParamSchema,
  createBanRequestSchema,
  createFlagRequestSchema,
  freezeBoardRequestSchema,
  idParamSchema,
  moderationNoteRequestSchema,
  moderationQuerySchema,
  removeReportRequestSchema,
} from '@tindak/shared';
import { validate } from '../../middlewares/validate.js';
import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { rejectBanned } from '../../middlewares/rejectBanned.js';
import { createRateLimiter } from '../../middlewares/rateLimit.js';
import {
  auditLogs,
  ban,
  bans,
  boards,
  dismissFlags,
  flag,
  freeze,
  moderation,
  remove,
  restore,
  stats,
  unban,
  unfreeze,
  users,
} from './moderation.controller.js';

export function createFlagsRouter() {
  const router = Router();
  const limiter = createRateLimiter({
    windowMs: 60_000,
    limit: 20,
    message: 'Terlalu banyak tanda pelanggaran. Coba lagi sebentar.',
  });
  router.post('/', requireAuth, limiter, rejectBanned, validate(createFlagRequestSchema), flag);
  return router;
}

export function createAdminRouter() {
  const router = Router();
  const idParams = validate(idParamSchema, 'params');
  const slugParams = validate(boardSlugParamSchema, 'params');

  router.use(requireAdmin);
  router.get('/stats', stats);
  router.get('/moderation', validate(moderationQuerySchema, 'query'), moderation);
  router.post('/reports/:id/restore', idParams, validate(moderationNoteRequestSchema), restore);
  router.post('/reports/:id/remove', idParams, validate(removeReportRequestSchema), remove);
  router.get('/bans', validate(adminBansQuerySchema, 'query'), bans);
  router.post('/bans', validate(createBanRequestSchema), ban);
  router.delete('/bans/:id', idParams, unban);
  router.get('/boards', validate(adminBoardsQuerySchema, 'query'), boards);
  router.post('/boards/:slug/freeze', slugParams, validate(freezeBoardRequestSchema), freeze);
  router.post('/boards/:slug/unfreeze', slugParams, unfreeze);
  router.post(
    '/boards/:slug/dismiss-flags',
    slugParams,
    validate(moderationNoteRequestSchema),
    dismissFlags,
  );
  router.get('/users', validate(adminListQuerySchema, 'query'), users);
  router.get('/audit-logs', validate(auditLogQuerySchema, 'query'), auditLogs);
  return router;
}
