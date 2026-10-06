import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const GOOGLE_ENV = {
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:5173/api/auth/google/callback',
};

let app;
let prisma;
let service;
let helpers;

beforeAll(async () => {
  Object.assign(process.env, GOOGLE_ENV);
  vi.resetModules();
  ({ prisma } = await import('../src/lib/prisma.js'));
  const { createApp } = await import('../src/app.js');
  service = await import('../src/modules/auth/auth.service.js');
  helpers = await import('./helpers/db.js');
  app = createApp();
});

beforeEach(async () => {
  await helpers.resetDatabase();
});

afterAll(async () => {
  await helpers.resetDatabase();
  for (const key of Object.keys(GOOGLE_ENV)) delete process.env[key];
  await prisma.$disconnect();
});

function profile(overrides = {}) {
  return {
    id: 'google-001',
    displayName: 'Siti Aminah',
    emails: [{ value: 'Siti@Gmail.com', verified: true }],
    photos: [{ value: 'https://lh3.googleusercontent.com/a/foto' }],
    ...overrides,
  };
}

describe('GET /api/auth/google dengan konfigurasi', () => {
  it('mengarahkan ke Google dengan state dan menyimpan redirect yang aman', async () => {
    const agent = request.agent(app);
    const res = await agent.get('/api/auth/google?returnTo=/b/jalan-rungkut');

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.hostname).toBe('accounts.google.com');
    expect(location.searchParams.get('client_id')).toBe(GOOGLE_ENV.GOOGLE_CLIENT_ID);
    expect(location.searchParams.get('redirect_uri')).toBe(GOOGLE_ENV.GOOGLE_CALLBACK_URL);
    expect(location.searchParams.get('state')).toBeTruthy();

    const [row] = await prisma.session.findMany();
    expect(JSON.parse(row.data).returnTo).toBe('/b/jalan-rungkut');
  });

  it('mengganti redirect berbahaya menjadi /', async () => {
    const agent = request.agent(app);
    await agent.get('/api/auth/google?returnTo=//evil.com');

    const [row] = await prisma.session.findMany();
    expect(JSON.parse(row.data).returnTo).toBe('/');
  });

  it('callback tanpa state yang cocok diarahkan ke /masuk?error=google', async () => {
    const res = await request(app).get('/api/auth/google/callback?code=abc&state=palsu');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173/masuk?error=google');
  });

  it('callback yang dibatalkan user diarahkan ke /masuk?error=google', async () => {
    const res = await request(app).get('/api/auth/google/callback?error=access_denied');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173/masuk?error=google');
  });
});

describe('findOrCreateGoogleUser', () => {
  it('membuat user baru tanpa password dari profil Google', async () => {
    const user = await service.findOrCreateGoogleUser(profile());

    expect(user).toMatchObject({
      name: 'Siti Aminah',
      email: 'siti@gmail.com',
      googleId: 'google-001',
      passwordHash: null,
      avatarUrl: 'https://lh3.googleusercontent.com/a/foto',
      role: 'USER',
    });
    expect(service.toPublicUser(user)).toMatchObject({ hasPassword: false });
    expect(service.toPublicUser(user)).not.toHaveProperty('googleId');
  });

  it('menautkan akun email, mencabut password, dan menghapus semua session lamanya', async () => {
    const existing = await helpers.createUser({ email: 'siti@gmail.com', name: 'Siti' });
    const other = await helpers.createUser({ email: 'lain@gmail.com' });
    const expiresAt = new Date(Date.now() + 60_000);
    await prisma.session.createMany({
      data: [
        { id: 's-penyerang-1', data: '{}', expiresAt, userId: existing.id },
        { id: 's-penyerang-2', data: '{}', expiresAt, userId: existing.id },
        { id: 's-orang-lain', data: '{}', expiresAt, userId: other.id },
      ],
    });

    const user = await service.findOrCreateGoogleUser(profile());

    expect(user.id).toBe(existing.id);
    expect(user.name).toBe('Siti');
    expect(user.googleId).toBe('google-001');
    expect(user.passwordHash).toBeNull();
    expect(await prisma.user.count()).toBe(2);
    const sessions = await prisma.session.findMany({ select: { id: true } });
    expect(sessions).toEqual([{ id: 's-orang-lain' }]);
  });

  it('login ulang dengan Google mengembalikan user yang sama', async () => {
    const first = await service.findOrCreateGoogleUser(profile());
    const second = await service.findOrCreateGoogleUser(profile());

    expect(second.id).toBe(first.id);
    expect(second.lastLoginAt).not.toBeNull();
    expect(await prisma.user.count()).toBe(1);
  });

  it('menolak profil Google tanpa status verifikasi email', async () => {
    await expect(
      service.findOrCreateGoogleUser(profile({ emails: [{ value: 'siti@gmail.com' }] })),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('memakai googleId walaupun email Google berubah', async () => {
    const existing = await helpers.createUser({ email: 'lama@gmail.com', googleId: 'google-001' });

    const user = await service.findOrCreateGoogleUser(profile());

    expect(user.id).toBe(existing.id);
    expect(user.email).toBe('lama@gmail.com');
  });

  it('memberi role BOARD_ADMIN untuk akun Google di BOARD_ADMIN_EMAILS', async () => {
    const user = await service.findOrCreateGoogleUser(
      profile({ id: 'g-board', emails: [{ value: 'boardadmin@tindak.test', verified: true }] }),
    );

    expect(user.role).toBe('BOARD_ADMIN');
  });

  it('menolak email Google yang belum terverifikasi', async () => {
    await expect(
      service.findOrCreateGoogleUser(
        profile({ emails: [{ value: 'siti@gmail.com', verified: false }] }),
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(await prisma.user.count()).toBe(0);
  });

  it('memotong nama yang terlalu panjang dan memberi nama cadangan', async () => {
    const long = await service.findOrCreateGoogleUser(
      profile({ id: 'g-long', displayName: 'A'.repeat(80) }),
    );
    const empty = await service.findOrCreateGoogleUser(
      profile({
        id: 'g-empty',
        displayName: '',
        emails: [{ value: 'x@gmail.com', verified: true }],
      }),
    );

    expect(long.name).toHaveLength(50);
    expect(empty.name).toBe('Pengguna Google');
  });
});
