import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '@tindak/shared';
import { safeRedirectPath } from '../src/utils/safeRedirect.js';
import { PrismaSessionStore } from '../src/lib/PrismaSessionStore.js';
import { prisma } from '../src/lib/prisma.js';
import { resetDatabase } from './helpers/db.js';
import { assertTestDatabase } from './helpers/assertTestDatabase.js';

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
    await call('set', 'sid-1', { cookie: { expires: future }, passport: { user: 1 } });

    expect(await call('get', 'sid-1')).toMatchObject({ passport: { user: 1 } });

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
