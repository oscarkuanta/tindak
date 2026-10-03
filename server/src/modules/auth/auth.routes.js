import { Router } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import { loginSchema, registerSchema } from '@tindak/shared';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { createRateLimiter } from '../../middlewares/rateLimit.js';
import { googleCallback, googleStart, login, logout, me, register } from './auth.controller.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function loginKey(req) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${ipKeyGenerator(req.ip)}:${email}`;
}

export function createAuthRouter() {
  const router = Router();

  const registerLimiter = createRateLimiter({
    windowMs: FIFTEEN_MINUTES,
    limit: 10,
    message: 'Terlalu banyak percobaan daftar. Coba lagi dalam 15 menit.',
  });

  const loginLimiter = createRateLimiter({
    windowMs: FIFTEEN_MINUTES,
    limit: 10,
    message: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.',
    keyGenerator: loginKey,
    skipSuccessfulRequests: true,
  });

  router.post('/register', registerLimiter, validate(registerSchema), register);
  router.post('/login', loginLimiter, validate(loginSchema), login);
  router.post('/logout', requireAuth, logout);
  router.get('/me', me);
  router.get('/google', googleStart);
  router.get('/google/callback', googleCallback);

  return router;
}
