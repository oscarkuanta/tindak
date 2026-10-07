import { Router } from 'express';
import { idParamSchema, notificationsQuerySchema } from '@tindak/shared';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { count, list, read, readAll } from './notifications.controller.js';

export function createNotificationsRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get('/', validate(notificationsQuerySchema, 'query'), list);
  router.get('/unread-count', count);
  router.post('/read-all', readAll);
  router.post('/:id/read', validate(idParamSchema, 'params'), read);
  return router;
}
