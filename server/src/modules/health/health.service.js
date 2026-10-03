import { ERROR_CODES } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';

export async function checkHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const appError = new AppError(
      503,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      'Database tidak dapat dihubungi',
    );
    appError.cause = error;
    throw appError;
  }
  return { status: 'ok', db: 'ok' };
}
