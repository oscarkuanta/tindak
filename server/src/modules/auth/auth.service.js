import bcrypt from 'bcryptjs';
import { ERROR_CODES, NAME_MAX_LENGTH, USER_ROLES } from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

export const BCRYPT_COST = 12;

let dummyHashPromise;

function getDummyHash() {
  dummyHashPromise ??= bcrypt.hash('tindak-dummy-password-0', BCRYPT_COST);
  return dummyHashPromise;
}

function invalidCredentials() {
  return new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, 'Email atau password salah');
}

function emailTaken() {
  return new AppError(409, ERROR_CODES.EMAIL_TAKEN, 'Email sudah terdaftar', [
    { field: 'email', message: 'Email sudah terdaftar' },
  ]);
}

function useGoogleLogin() {
  return new AppError(
    401,
    ERROR_CODES.USE_GOOGLE_LOGIN,
    'Akun ini terdaftar lewat Google. Silakan masuk dengan Google.',
  );
}

export function isAdminEmail(email) {
  return env.ADMIN_EMAILS.includes(email.toLowerCase());
}

function roleForLogin(user) {
  return isAdminEmail(user.email) ? USER_ROLES.ADMIN : user.role;
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    hasPassword: Boolean(user.passwordHash),
    needsOnboarding: user.onboardedAt === null,
    createdAt: user.createdAt,
  };
}

export async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

async function recordLogin(user) {
  return prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), role: roleForLogin(user) },
  });
}

export async function registerUser({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw emailTaken();

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    return await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: isAdminEmail(email) ? USER_ROLES.ADMIN : USER_ROLES.USER,
        lastLoginAt: new Date(),
      },
    });
  } catch (error) {
    if (error?.code === 'P2002') throw emailTaken();
    throw error;
  }
}

export async function authenticateUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await bcrypt.compare(password, await getDummyHash());
    throw invalidCredentials();
  }

  if (!user.passwordHash) throw useGoogleLogin();

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw invalidCredentials();

  return recordLogin(user);
}

function nameFromGoogleProfile(profile, email) {
  const candidate = (profile.displayName ?? '').trim() || email.split('@')[0];
  const name = candidate.slice(0, NAME_MAX_LENGTH).trim();
  return name.length >= 2 ? name : 'Pengguna Google';
}

export async function findOrCreateGoogleUser(profile) {
  const googleId = String(profile.id);
  const primaryEmail = profile.emails?.[0];
  const email = primaryEmail?.value?.trim().toLowerCase();
  const avatarUrl = profile.photos?.[0]?.value ?? null;

  const byGoogleId = await prisma.user.findUnique({ where: { googleId } });
  if (byGoogleId) return recordLogin(byGoogleId);

  if (!email || primaryEmail.verified !== true) {
    throw new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Email Google belum terverifikasi');
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    const [, linked] = await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: byEmail.id } }),
      prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId,
          passwordHash: null,
          avatarUrl: byEmail.avatarUrl ?? avatarUrl,
          lastLoginAt: new Date(),
          role: roleForLogin(byEmail),
        },
      }),
    ]);
    return linked;
  }

  return prisma.user.create({
    data: {
      name: nameFromGoogleProfile(profile, email),
      email,
      googleId,
      avatarUrl,
      role: isAdminEmail(email) ? USER_ROLES.ADMIN : USER_ROLES.USER,
      lastLoginAt: new Date(),
    },
  });
}

export async function promoteToAdmin(email) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    throw new AppError(
      404,
      ERROR_CODES.NOT_FOUND,
      `User dengan email ${normalized} tidak ditemukan`,
    );
  }
  return prisma.user.update({ where: { id: user.id }, data: { role: USER_ROLES.ADMIN } });
}
