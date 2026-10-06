import { ERROR_CODES, REPORT_LIMITS } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatWait(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} menit`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}

function limitError(message, retryAt, now) {
  return new AppError(
    429,
    ERROR_CODES.RATE_LIMITED,
    `${message} Kamu bisa melapor lagi dalam ${formatWait(retryAt - now)}.`,
    [{ field: 'retryAt', message: retryAt.toISOString() }],
  );
}

async function checkDailyLimit(where, limit, message, now) {
  const since = new Date(now - DAY_MS);
  const recent = await prisma.report.findMany({
    where: { ...where, createdAt: { gt: since } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
    take: limit,
  });
  if (recent.length >= limit) {
    throw limitError(message, new Date(recent[0].createdAt.getTime() + DAY_MS), now);
  }
}

async function checkCooldown(where, seconds, now) {
  const last = await prisma.report.findFirst({
    where: { ...where, createdAt: { gt: new Date(now - seconds * 1000) } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (last) {
    throw limitError(
      'Tunggu sebentar sebelum mengirim laporan berikutnya.',
      new Date(last.createdAt.getTime() + seconds * 1000),
      now,
    );
  }
}

export async function assertReportQuota({ user, guestTokenHash, ipHash }, now = new Date()) {
  if (user) {
    await checkCooldown({ userId: user.id }, REPORT_LIMITS.USER_COOLDOWN_SECONDS, now);
    await checkDailyLimit(
      { userId: user.id },
      REPORT_LIMITS.USER_PER_DAY,
      `Batas ${REPORT_LIMITS.USER_PER_DAY} laporan per hari untuk akunmu sudah tercapai.`,
      now,
    );
  } else {
    await checkCooldown({ guestTokenHash }, REPORT_LIMITS.GUEST_COOLDOWN_SECONDS, now);
    await checkDailyLimit(
      { guestTokenHash },
      REPORT_LIMITS.GUEST_PER_DAY,
      `Batas ${REPORT_LIMITS.GUEST_PER_DAY} laporan per hari dari perangkat ini sudah tercapai. Masuk untuk mendapat batas lebih banyak.`,
      now,
    );
  }
  await checkDailyLimit(
    { ipHash },
    REPORT_LIMITS.NETWORK_PER_DAY,
    `Batas ${REPORT_LIMITS.NETWORK_PER_DAY} laporan per hari dari jaringan ini sudah tercapai.`,
    now,
  );
}
