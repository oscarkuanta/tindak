import { ERROR_CODES } from '@tindak/shared';
import { AppError } from '../utils/AppError.js';

export function requireAuth(req, res, next) {
  if (req.isAuthenticated?.() && req.user) return next();
  next(new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Kamu harus masuk terlebih dahulu'));
}
