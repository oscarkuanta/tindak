import { ERROR_CODES } from '@tindak/shared';
import { AppError } from '../utils/AppError.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createVerifyOrigin(allowedOrigin) {
  const allowed = new URL(allowedOrigin).origin;

  return function verifyOrigin(req, res, next) {
    if (!UNSAFE_METHODS.has(req.method)) return next();

    const origin = req.get('origin');
    if (!origin || origin === allowed) return next();

    next(
      new AppError(
        403,
        ERROR_CODES.CSRF_REJECTED,
        'Permintaan ditolak karena berasal dari situs yang tidak dikenal',
      ),
    );
  };
}
