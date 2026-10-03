import { ERROR_CODES } from '@tindak/shared';
import { AppError } from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(
    new AppError(
      404,
      ERROR_CODES.NOT_FOUND,
      `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
    ),
  );
}
