import { ERROR_CODES } from '@tindak/shared';
import { AppError } from '../utils/AppError.js';
import { findVisibleBoard, getBoardMembership } from '../modules/boards/boards.service.js';

export function requireBoardRole(...roles) {
  return async function boardRoleGuard(req, res, next) {
    if (!req.user) {
      throw new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Kamu harus masuk terlebih dahulu');
    }
    const board = await findVisibleBoard(req.params.slug, req.user);
    const membership = await getBoardMembership(board.id, req.user.id);
    if (!membership || !roles.includes(membership.role)) {
      throw new AppError(
        403,
        ERROR_CODES.FORBIDDEN,
        'Kamu tidak punya akses untuk mengelola Board ini',
      );
    }
    req.board = board;
    req.membership = membership;
    next();
  };
}
