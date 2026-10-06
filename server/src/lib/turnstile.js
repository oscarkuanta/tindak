import { ERROR_CODES } from '@tindak/shared';
import { env, TURNSTILE_TEST_SECRETS } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from './logger.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 8000;

function captchaFailed() {
  return new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Verifikasi captcha gagal', [
    { field: 'turnstileToken', message: 'Verifikasi captcha gagal, silakan ulangi' },
  ]);
}

async function verifyWithCloudflare(token, ip) {
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const result = await response.json();
    return Boolean(result.success);
  } catch (error) {
    logger.error({ err: error }, 'Verifikasi Turnstile tidak dapat dihubungi');
    throw new AppError(
      503,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      'Verifikasi captcha sedang tidak tersedia, coba lagi sebentar',
    );
  }
}

export async function verifyTurnstile(token, ip) {
  if (!token) throw captchaFailed();
  if (env.TURNSTILE_SECRET_KEY === TURNSTILE_TEST_SECRETS.PASS) return;
  if (env.TURNSTILE_SECRET_KEY === TURNSTILE_TEST_SECRETS.FAIL) throw captchaFailed();
  if (!(await verifyWithCloudflare(token, ip))) throw captchaFailed();
}
