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
    const res = await agent.get('/api/auth/google?redirect=/b/jalan-rungkut');

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.hostname).toBe('accounts.google.com');
    expect(location.searchParams.get('client_id')).toBe(GOOGLE_ENV.GOOGLE_CLIENT_ID);
    expect(location.searchParams.get('redirect_uri')).toBe(GOOGLE_ENV.GOOGLE_CALLBACK_URL);
    expect(location.searchParams.get('state')).toBeTruthy();

    const [row] = await prisma.session.findMany();
    expect(JSON.parse(row.data).oauthRedirect).toBe('/b/jalan-rungkut');
  });

  it('mengganti redirect berbahaya menjadi /', async () => {
    const agent = request.agent(app);
    await agent.get('/api/auth/google?redirect=//evil.com');

    const [row] = await prisma.session.findMany();
    expect(JSON.parse(row.data).oauthRedirect).toBe('/');
  });

  it('callback tanpa state yang cocok diarahkan ke google_failed', async () => {
    const res = await request(app).get('/api/auth/google/callback?code=abc&state=palsu');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173/login?error=google_failed');
  });

  it('callback yang dibatalkan user diarahkan ke google_failed', async () => {
    const res = await request(app).get('/api/auth/google/callback?error=access_denied');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173/login?error=google_failed');
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
    expect(service.toPublicUser(user)).toMatchObject({ hasPassword: false, hasGoogle: true });
  });

  it('menautkan akun email yang sudah ada tanpa menghapus password', async () => {
    const existing = await helpers.createUser({ email: 'siti@gmail.com', name: 'Siti' });

    const user = await service.findOrCreateGoogleUser(profile());

    expect(user.id).toBe(existing.id);
    expect(user.name).toBe('Siti');
    expect(user.googleId).toBe('google-001');
    expect(user.passwordHash).toBe(existing.passwordHash);
    expect(await prisma.user.count()).toBe(1);
  });

  it('memakai googleId walaupun email Google berubah', async () => {
    const existing = await helpers.createUser({ email: 'lama@gmail.com', googleId: 'google-001' });

    const user = await service.findOrCreateGoogleUser(profile());

    expect(user.id).toBe(existing.id);
    expect(user.email).toBe('lama@gmail.com');
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
