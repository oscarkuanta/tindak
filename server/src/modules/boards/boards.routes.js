import { Router } from 'express';
import {
  boardCategoryParamSchema,
  boardSearchQuerySchema,
  boardSlugParamSchema,
  citySearchQuerySchema,
  createBoardRequestSchema,
  createCategoryRequestSchema,
  reorderCategoriesRequestSchema,
  similarBoardQuerySchema,
  updateBoardRequestSchema,
  updateCategoryRequestSchema,
} from '@tindak/shared';
import { validate } from '../../middlewares/validate.js';
import { optionalAuth, requireAuth } from '../../middlewares/auth.js';
import { requireBoardRole } from '../../middlewares/boardAccess.js';
import { createRateLimiter } from '../../middlewares/rateLimit.js';
import {
  cities,
  create,
  createCategory,
  detail,
  editCategory,
  myBoards,
  orderCategories,
  removeCategory,
  search,
  similar,
  update,
} from './boards.controller.js';

const ownerOnly = requireBoardRole('OWNER');

export function createBoardsRouter() {
  const router = Router();

  const createLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: 'Terlalu banyak membuat Board. Coba lagi dalam 1 jam.',
  });

  router.post('/', requireAuth, createLimiter, validate(createBoardRequestSchema), create);
  router.get('/search', validate(boardSearchQuerySchema, 'query'), search);
  router.get('/similar', validate(similarBoardQuerySchema, 'query'), similar);
  router.get('/:slug', optionalAuth, validate(boardSlugParamSchema, 'params'), detail);
  router.patch('/:slug', ownerOnly, validate(updateBoardRequestSchema), update);
  router.post(
    '/:slug/categories',
    ownerOnly,
    validate(createCategoryRequestSchema),
    createCategory,
  );
  router.put(
    '/:slug/categories/order',
    ownerOnly,
    validate(reorderCategoriesRequestSchema),
    orderCategories,
  );
  router.patch(
    '/:slug/categories/:id',
    ownerOnly,
    validate(boardCategoryParamSchema, 'params'),
    validate(updateCategoryRequestSchema),
    editCategory,
  );
  router.delete(
    '/:slug/categories/:id',
    ownerOnly,
    validate(boardCategoryParamSchema, 'params'),
    removeCategory,
  );

  return router;
}

export function createMeBoardsRouter() {
  const router = Router();
  router.get('/boards', requireAuth, myBoards);
  return router;
}

export function createMetaRouter() {
  const router = Router();
  router.get('/cities', validate(citySearchQuerySchema, 'query'), cities);
  return router;
}
