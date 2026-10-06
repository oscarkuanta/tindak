import { Router } from 'express';
import {
  boardCategoryParamSchema,
  boardMemberParamSchema,
  boardSearchQuerySchema,
  boardSlugParamSchema,
  citySearchQuerySchema,
  createBoardRequestSchema,
  createCategoryRequestSchema,
  followNotifyLevelRequestSchema,
  invitationParamSchema,
  inviteHandlerRequestSchema,
  reorderCategoriesRequestSchema,
  similarBoardQuerySchema,
  transferOwnershipRequestSchema,
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
import { follow, myFollows, unfollow, updateNotifyLevel } from '../follows/follows.controller.js';
import {
  accept,
  decline,
  handlers,
  invitations,
  invite,
  remove,
  transfer,
} from '../members/members.controller.js';

const ownerOnly = requireBoardRole('OWNER');
const boardStaff = requireBoardRole('OWNER', 'HANDLER');
const slugParams = validate(boardSlugParamSchema, 'params');

export function createBoardsRouter() {
  const router = Router();

  const createLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: 'Terlalu banyak membuat Board. Coba lagi dalam 1 jam.',
  });

  router.post('/', requireAuth, createLimiter, validate(createBoardRequestSchema), create);
  router.get('/search', optionalAuth, validate(boardSearchQuerySchema, 'query'), search);
  router.get('/similar', optionalAuth, validate(similarBoardQuerySchema, 'query'), similar);
  router.get('/:slug', optionalAuth, slugParams, detail);
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

  router.post('/:slug/follow', requireAuth, slugParams, follow);
  router.delete('/:slug/follow', requireAuth, slugParams, unfollow);
  router.patch(
    '/:slug/follow',
    requireAuth,
    slugParams,
    validate(followNotifyLevelRequestSchema),
    updateNotifyLevel,
  );

  const inviteLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    message: 'Terlalu banyak undangan. Coba lagi dalam 1 jam.',
  });

  router.get('/:slug/handlers', boardStaff, handlers);
  router.post(
    '/:slug/handlers',
    ownerOnly,
    inviteLimiter,
    validate(inviteHandlerRequestSchema),
    invite,
  );
  router.delete(
    '/:slug/handlers/:userId',
    ownerOnly,
    validate(boardMemberParamSchema, 'params'),
    remove,
  );
  router.post('/:slug/transfer', ownerOnly, validate(transferOwnershipRequestSchema), transfer);

  return router;
}

export function createMeBoardsRouter() {
  const router = Router();
  const invitationParams = validate(invitationParamSchema, 'params');

  router.get('/boards', requireAuth, myBoards);
  router.get('/follows', requireAuth, myFollows);
  router.get('/invitations', requireAuth, invitations);
  router.post('/invitations/:id/accept', requireAuth, invitationParams, accept);
  router.post('/invitations/:id/decline', requireAuth, invitationParams, decline);
  return router;
}

export function createMetaRouter() {
  const router = Router();
  router.get('/cities', validate(citySearchQuerySchema, 'query'), cities);
  return router;
}
