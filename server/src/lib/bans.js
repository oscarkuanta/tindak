import { ERROR_CODES } from '@tindak/shared';
import { prisma } from './prisma.js';
import { AppError } from '../utils/AppError.js';

export function activeBanWhere(now = new Date()) {
  return { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

export async function findActiveBan({ userId, guestTokenHash, ipHash }, now = new Date()) {
  const targets = [
    userId && { targetType: 'USER', targetValue: String(userId) },
    guestTokenHash && { targetType: 'GUEST_TOKEN', targetValue: guestTokenHash },
    ipHash && { targetType: 'IP', targetValue: ipHash },
  ].filter(Boolean);
  if (targets.length === 0) return null;
  return prisma.ban.findFirst({
    where: { AND: [activeBanWhere(now), { OR: targets }] },
  });
}

export async function isBanned(identity) {
  return Boolean(await findActiveBan(identity));
}

export function remainingText(expiresAt, now = new Date()) {
  const minutes = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
  if (hours > 0) return `${hours} jam`;
  return `${minutes} menit`;
}

export function bannedError(ban, now = new Date()) {
  const message = ban.expiresAt
    ? `Kamu sedang diblokir. Blokir berakhir dalam ${remainingText(ban.expiresAt, now)}.`
    : 'Kamu diblokir permanen karena melanggar aturan komunitas.';
  return new AppError(403, ERROR_CODES.ACCOUNT_BANNED, message, [
    { field: 'bannedUntil', message: ban.expiresAt ? ban.expiresAt.toISOString() : 'permanen' },
  ]);
}

export async function assertNotBanned(identity) {
  const ban = await findActiveBan(identity);
  if (ban) throw bannedError(ban);
}
