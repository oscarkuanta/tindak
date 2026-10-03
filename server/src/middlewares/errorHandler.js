import { ZodError } from 'zod';
import { ERROR_CODES } from '@tindak/shared';
import { AppError } from '../utils/AppError.js';
import { errorBody } from '../utils/response.js';
import { isProduction } from '../config/env.js';

const PRISMA_KNOWN_ERROR = 'PrismaClientKnownRequestError';

function fromZodError(error) {
  return new AppError(
    400,
    ERROR_CODES.VALIDATION_ERROR,
    'Data yang dikirim tidak valid',
    error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  );
}

function fromPrismaError(error) {
  if (error.code === 'P2002') {
    const target = error.meta?.target;
    const fields = Array.isArray(target) ? target : target ? [target] : [];
    return new AppError(
      409,
      ERROR_CODES.CONFLICT,
      'Data sudah ada',
      fields.map((field) => ({ field, message: 'Nilai ini sudah dipakai' })),
    );
  }
  if (error.code === 'P2025') {
    return new AppError(404, ERROR_CODES.NOT_FOUND, 'Data tidak ditemukan');
  }
  return null;
}

function fromBodyParserError(error) {
  if (error.type === 'entity.parse.failed') {
    return new AppError(400, ERROR_CODES.INVALID_JSON, 'Format JSON tidak valid');
  }
  if (error.type === 'entity.too.large') {
    return new AppError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, 'Ukuran data terlalu besar');
  }
  return null;
}

export function toAppError(error) {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) return fromZodError(error);
  if (error?.name === PRISMA_KNOWN_ERROR) {
    const mapped = fromPrismaError(error);
    if (mapped) return mapped;
  }
  return fromBodyParserError(error);
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const appError = toAppError(error);

  if (appError) {
    if (appError.status >= 500) req.log?.error({ err: error }, appError.message);
    return res
      .status(appError.status)
      .json(errorBody(appError.code, appError.message, appError.details));
  }

  req.log?.error({ err: error }, 'Unhandled error');

  const body = errorBody(ERROR_CODES.INTERNAL_ERROR, 'Terjadi kesalahan pada server');
  if (!isProduction) body.error.stack = error?.stack;
  return res.status(500).json(body);
}
