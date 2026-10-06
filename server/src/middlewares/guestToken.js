import { isProduction } from '../config/env.js';
import { randomToken, sha256 } from '../utils/crypto.js';

export const GUEST_COOKIE_NAME = 'tindak.gt';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function guestToken(req, res, next) {
  let token = req.cookies?.[GUEST_COOKIE_NAME];
  if (!token || !TOKEN_PATTERN.test(token)) {
    token = randomToken(32);
    res.cookie(GUEST_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: ONE_YEAR_MS,
      path: '/',
    });
  }
  req.guestTokenHash = sha256(token);
  next();
}
