import { rateLimit } from 'express-rate-limit';
import { ERROR_CODES } from '@tindak/shared';
import { errorBody } from '../utils/response.js';

export function createRateLimiter({
  windowMs = 60_000,
  limit = 100,
  message = 'Terlalu banyak permintaan, coba lagi nanti',
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json(errorBody(ERROR_CODES.RATE_LIMITED, message));
    },
  });
}

export const apiLimiter = createRateLimiter({ windowMs: 60_000, limit: 300 });
