import { assertNotBanned } from '../lib/bans.js';
import { hashIp, sha256 } from '../utils/crypto.js';
import { GUEST_COOKIE_NAME } from './guestToken.js';

export function requestIdentity(req) {
  const guestToken = req.cookies?.[GUEST_COOKIE_NAME];
  return {
    userId: req.user?.id ?? null,
    guestTokenHash: req.guestTokenHash ?? (guestToken ? sha256(guestToken) : null),
    ipHash: hashIp(req.ip),
  };
}

export async function rejectBanned(req, res, next) {
  await assertNotBanned(requestIdentity(req));
  next();
}
