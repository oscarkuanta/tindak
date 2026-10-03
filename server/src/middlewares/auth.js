import passport from 'passport';
import { ERROR_CODES, USER_ROLES } from '@tindak/shared';
import { AppError } from '../utils/AppError.js';

const passportSession = passport.session();

export function attachUser(req, res, next) {
  passportSession(req, res, (error) => {
    if (error) return next(error);
    req.user ??= null;
    next();
  });
}

export function optionalAuth(req, res, next) {
  if (req.user !== undefined) return next();
  attachUser(req, res, next);
}

export function requireAuth(req, res, next) {
  if (req.user) return next();
  next(new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Kamu harus masuk terlebih dahulu'));
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Kamu harus masuk terlebih dahulu'));
  }
  if (req.user.role !== USER_ROLES.ADMIN) {
    return next(new AppError(403, ERROR_CODES.FORBIDDEN, 'Hanya Admin yang boleh melakukan ini'));
  }
  next();
}
