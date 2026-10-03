import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createUser, resetDatabase } from './helpers/db.js';

const validRegister = {
  name: 'Budi Santoso',
  email: 'Budi@Example.com',
  password: 'rahasia123',
};

let app;

beforeEach(async () => {
  await resetDatabase();
  app = createApp();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

function sessionCookie(res) {
  return (res.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith('tindak.sid='));
}

describe('POST /api/auth/register', () => {
  it('mendaftarkan user, langsung login, dan tidak mengirim password', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send(validRegister);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Budi Santoso',
      email: 'budi@example.com',
      avatarUrl: null,
      role: 'USER',
      hasPassword: true,
      hasGoogle: false,
      needsOnboarding: true,
    });
    expect(res.body.data).not.toHaveProperty('passwordHash');

    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await agent.get('/api/auth/me');
    expect(me.body.data.email).toBe('budi@example.com');

    const user = await prisma.user.findUnique({ where: { email: 'budi@example.com' } });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(await prisma.session.count()).toBe(1);
  });

  it('memberi role ADMIN untuk email di ADMIN_EMAILS', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validRegister, email: 'ADMIN@tindak.test' });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('menolak input tidak valid dengan detail per field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'B', email: 'bukan-email', password: 'pendek' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((detail) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('menolak password tanpa angka', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validRegister, password: 'tanpaangka' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual({
      field: 'password',
      message: 'Password harus mengandung minimal 1 angka',
    });
  });

  it('menolak email yang sudah terdaftar tanpa memedulikan huruf besar kecil', async () => {
    await createUser({ email: 'budi@example.com' });

    const res = await request(app).post('/api/auth/register').send(validRegister);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('membatasi 10 percobaan daftar per 15 menit', async () => {
    for (let i = 0; i < 10; i += 1) {
      await request(app).post('/api/auth/register').send({ name: 'X' });
    }
    const res = await request(app).post('/api/auth/register').send(validRegister);

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('POST /api/auth/login', () => {
  it('login dengan email dan password yang benar', async () => {
    await createUser();
    const agent = request.agent(app);

    const res = await agent
      .post('/api/auth/login')
      .send({ email: ' BUDI@example.com ', password: 'rahasia123' });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('budi@example.com');
    expect(sessionCookie(res)).toBeDefined();

    const user = await prisma.user.findUnique({ where: { email: 'budi@example.com' } });
    expect(user.lastLoginAt).not.toBeNull();

    const me = await agent.get('/api/auth/me');
    expect(me.body.data.id).toBe(user.id);
  });

  it('mengganti session ID saat login', async () => {
    await createUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'budi@example.com', password: 'salah123' });
    const first = await agent
      .post('/api/auth/login')
      .send({ email: 'budi@example.com', password: 'rahasia123' });
    const second = await agent
      .post('/api/auth/login')
      .send({ email: 'budi@example.com', password: 'rahasia123' });

    expect(sessionCookie(first)).toBeDefined();
    expect(sessionCookie(second)).toBeDefined();
    expect(sessionCookie(first).split(';')[0]).not.toBe(sessionCookie(second).split(';')[0]);
    expect(await prisma.session.count()).toBe(1);
  });

  it('memberi pesan yang sama untuk password salah dan email tidak terdaftar', async () => {
    await createUser();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'budi@example.com', password: 'salah1234' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'siapa@example.com', password: 'rahasia123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('menolak login password untuk akun yang hanya terhubung Google', async () => {
    await createUser({ password: null, googleId: 'google-123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'budi@example.com', password: 'rahasia123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('menolak input tidak valid', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'budi' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('membatasi 10 percobaan gagal per IP dan email', async () => {
    await createUser();
    for (let i = 0; i < 10; i += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'budi@example.com', password: 'salah1234' });
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'budi@example.com', password: 'rahasia123' });
    const otherEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lain@example.com', password: 'rahasia123' });

    expect(blocked.status).toBe(429);
    expect(otherEmail.status).toBe(401);
  });

  it('menyamakan role dengan ADMIN_EMAILS setiap login', async () => {
    await createUser({ email: 'admin@tindak.test', role: 'USER' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@tindak.test', password: 'rahasia123' });

    expect(res.body.data.role).toBe('ADMIN');
  });
});

describe('POST /api/auth/logout', () => {
  it('menolak jika belum login', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('menghapus session dan cookie', async () => {
    await createUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'budi@example.com', password: 'rahasia123' });

    const res = await agent.post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { loggedOut: true } });
    expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(await prisma.session.count()).toBe(0);

    const me = await agent.get('/api/auth/me');
    expect(me.body).toEqual({ data: null });
  });
});

describe('GET /api/auth/me', () => {
  it('mengembalikan null untuk tamu tanpa membuat session', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: null });
    expect(sessionCookie(res)).toBeUndefined();
    expect(await prisma.session.count()).toBe(0);
  });

  it('mengembalikan null jika user di session sudah dihapus', async () => {
    const user = await createUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'budi@example.com', password: 'rahasia123' });
    await prisma.user.delete({ where: { id: user.id } });

    const res = await agent.get('/api/auth/me');

    expect(res.body).toEqual({ data: null });
  });
});

describe('GET /api/auth/google tanpa konfigurasi', () => {
  it('mengarahkan ke halaman login dengan error google_unavailable', async () => {
    const res = await request(app).get('/api/auth/google');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173/login?error=google_unavailable');
  });

  it('callback juga mengarahkan ke google_unavailable', async () => {
    const res = await request(app).get('/api/auth/google/callback?code=abc');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173/login?error=google_unavailable');
  });
});
