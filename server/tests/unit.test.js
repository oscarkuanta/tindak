import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '@tindak/shared';
import { safeRedirectPath } from '../src/utils/safeRedirect.js';
import { PrismaSessionStore } from '../src/lib/PrismaSessionStore.js';
import { prisma } from '../src/lib/prisma.js';
import { createUser, resetDatabase } from './helpers/db.js';
import { assertTestDatabase } from './helpers/assertTestDatabase.js';
import { requireAdmin, requireAuth, requireBoardAdmin } from '../src/middlewares/auth.js';
import { promoteUser } from '../src/modules/auth/auth.service.js';

function runMiddleware(middleware, user) {
  let result;
  middleware({ user }, {}, (error) => {
    result = error ?? 'next';
  });
  return result;
}

describe('middleware hak akses', () => {
  it('requireAuth menolak tamu dan meneruskan user login', () => {
    expect(runMiddleware(requireAuth, null)).toMatchObject({ status: 401 });
    expect(runMiddleware(requireAuth, { id: 1, role: 'USER' })).toBe('next');
  });

  it('requireAdmin menolak user biasa dan tamu, meneruskan ADMIN', () => {
    expect(runMiddleware(requireAdmin, { id: 1, role: 'USER' })).toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
    expect(runMiddleware(requireAdmin, null)).toMatchObject({ status: 401 });
    expect(runMiddleware(requireAdmin, { id: 2, role: 'ADMIN' })).toBe('next');
  });

  it('requireBoardAdmin hanya meneruskan BOARD_ADMIN, ADMIN dan USER ditolak', () => {
    expect(runMiddleware(requireBoardAdmin, { id: 1, role: 'USER' })).toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
    expect(runMiddleware(requireBoardAdmin, { id: 2, role: 'ADMIN' })).toMatchObject({
      status: 403,
    });
    expect(runMiddleware(requireBoardAdmin, null)).toMatchObject({ status: 401 });
    expect(runMiddleware(requireBoardAdmin, { id: 3, role: 'BOARD_ADMIN' })).toBe('next');
  });
});

describe('safeRedirectPath', () => {
  it.each([
    ['/b/jalan-rungkut', '/b/jalan-rungkut'],
    ['/lapor?board=abc#form', '/lapor?board=abc#form'],
    ['/', '/'],
  ])('menerima path relatif %s', (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    undefined,
    '',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\\/evil.com',
    'javascript:alert(1)',
    'evil.com/path',
    '/path\nSet-Cookie: x',
    `/${'a'.repeat(600)}`,
    ['/array'],
  ])('menolak %s', (input) => {
    expect(safeRedirectPath(input)).toBe('/');
  });
});

describe('skema auth shared', () => {
  it('menormalkan email dan nama', () => {
    const result = registerSchema.parse({
      name: '  Budi  ',
      email: '  BUDI@Example.COM ',
      password: 'rahasia123',
    });
    expect(result).toEqual({ name: 'Budi', email: 'budi@example.com', password: 'rahasia123' });
  });

  it('menolak password lebih dari 72 byte', () => {
    const result = registerSchema.safeParse({
      name: 'Budi',
      email: 'budi@example.com',
      password: `a1${'é'.repeat(36)}`,
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Password terlalu panjang');
  });

  it('login tidak memeriksa aturan kekuatan password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });
});

describe('assertTestDatabase', () => {
  it('menolak database yang bukan database tes', () => {
    expect(() => assertTestDatabase('mysql://root@localhost:3306/tindak')).toThrow(/database tes/);
    expect(() => assertTestDatabase(undefined)).toThrow();
    expect(() => assertTestDatabase('mysql://root@localhost:3306/tindak_test')).not.toThrow();
  });
});

describe('promoteUser', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('menjadikan user ADMIN berdasarkan email tanpa memedulikan huruf besar kecil', async () => {
    await createUser();
    const user = await promoteUser('  BUDI@example.com ', 'ADMIN');
    expect(user.role).toBe('ADMIN');
  });

  it('gagal jika email tidak terdaftar', async () => {
    await expect(promoteUser('tidakada@example.com', 'ADMIN')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('PrismaSessionStore', () => {
  const store = new PrismaSessionStore(prisma, { pruneIntervalMs: 0 });
  const call = (method, ...args) =>
    new Promise((resolve, reject) => {
      store[method](...args, (error, result) => (error ? reject(error) : resolve(result)));
    });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it('menyimpan, membaca, memperbarui, dan menghapus session', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const user = await createUser();
    await call('set', 'sid-1', { cookie: { expires: future }, passport: { user: user.id } });

    expect(await call('get', 'sid-1')).toMatchObject({ passport: { user: user.id } });
    expect((await prisma.session.findUnique({ where: { id: 'sid-1' } })).userId).toBe(user.id);

    const later = new Date(Date.now() + 120_000).toISOString();
    await call('touch', 'sid-1', { cookie: { expires: later } });
    const row = await prisma.session.findUnique({ where: { id: 'sid-1' } });
    expect(row.expiresAt.toISOString()).toBe(later);

    await call('destroy', 'sid-1');
    expect(await call('get', 'sid-1')).toBeNull();
  });

  it('menganggap session kedaluwarsa tidak ada dan membersihkannya', async () => {
    await prisma.session.createMany({
      data: [
        { id: 'old', data: '{}', expiresAt: new Date(Date.now() - 1000) },
        { id: 'older', data: '{}', expiresAt: new Date(Date.now() - 5000) },
        { id: 'fresh', data: '{}', expiresAt: new Date(Date.now() + 60_000) },
      ],
    });

    expect(await call('get', 'old')).toBeNull();
    expect(await store.prune()).toBe(1);
    expect(await prisma.session.count()).toBe(1);
  });
});
