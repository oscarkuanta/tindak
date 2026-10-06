import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashIp(ip) {
  return createHmac('sha256', env.IP_HASH_SECRET)
    .update(ip ?? 'unknown')
    .digest('hex');
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
