import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { apiMounts } from '../src/routes.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { createUser, resetDatabase } from './helpers/db.js';

const GUARDS = new Set(['requireAuth', 'requireAdmin', 'requireBoardAdmin', 'boardRoleGuard']);
const PUBLIC_WRITES = new Set([
  'POST /api/auth/register',
  'POST /api/auth/login',
  'POST /api/boards/:slug/reports',
  'POST /api/reports/:id/answer-info',
  'POST /api/reports/:id/confirm',
]);
const SENSITIVE_KEYS = [
  'ipHash',
  'guestTokenHash',
  'trackingSecretHash',
  'passwordHash',
  'googleId',
];

function collectRoutes() {
  const routes = [];
  for (const [prefix, router] of apiMounts()) {
    let routerGuarded = false;
    for (const layer of router.stack) {
      if (!layer.route) {
        if (GUARDS.has(layer.name)) routerGuarded = true;
        continue;
      }
      const names = layer.route.stack.map((item) => item.name);
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({
          method: method.toUpperCase(),
          path: `/api${prefix}${layer.route.path}`,
          guarded: routerGuarded || names.some((name) => GUARDS.has(name)),
        });
      }
    }
  }
  return routes;
}

const concrete = (path) => path.replace(':slug', 'board-x').replace(/:(id|userId|code)/g, '1');

let app;

beforeEach(async () => {
  await resetDatabase();
  app = createApp();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('Hak akses semua endpoint tulis', () => {
  const writes = collectRoutes().filter((route) => route.method !== 'GET');

  it('setiap endpoint tulis punya cek login atau hak akses, kecuali daftar publik', () => {
    const unguarded = writes
      .filter((route) => !route.guarded)
      .map((route) => `${route.method} ${route.path}`);

    expect(writes.length).toBeGreaterThan(40);
    expect(new Set(unguarded)).toEqual(PUBLIC_WRITES);
  });

  it('tamu ditolak 401 di semua endpoint tulis yang dijaga', async () => {
    const results = [];
    for (const route of writes.filter((item) => item.guarded)) {
      const res = await request(app)[route.method.toLowerCase()](concrete(route.path)).send({});
      results.push(`${route.method} ${route.path} ${res.status}`);
    }

    expect(results.filter((line) => !line.endsWith(' 401'))).toEqual([]);
  });

  it('endpoint publik tetap meminta Kode Lacak atau login', async () => {
    const owner = await createUser({ email: 'owner@example.com' });
    const board = await prisma.board.create({
      data: {
        slug: 'board-x',
        name: 'Board X',
        city: 'Kota Surabaya',
        type: 'ROAD',
        description: 'Deskripsi Board uji yang cukup panjang.',
        ownerId: owner.id,
        categories: { create: [{ name: 'Lainnya', isDefault: true }] },
      },
      include: { categories: true },
    });
    const report = await prisma.report.create({
      data: {
        boardId: board.id,
        categoryId: board.categories[0].id,
        title: 'Laporan',
        description: 'Deskripsi laporan uji yang cukup panjang.',
        locationDetail: 'Lokasi',
        severity: 'LOW',
        status: 'AWAITING_CONFIRMATION',
        trackingCode: generateTrackingCode(),
        trackingSecretHash: sha256('rahasia'),
      },
    });

    const confirm = await request(app)
      .post(`/api/reports/${report.id}/confirm`)
      .field('result', 'resolved');
    const wrongSecret = await request(app)
      .post(`/api/reports/${report.id}/confirm`)
      .field('result', 'resolved')
      .field('trackingCode', report.trackingCode)
      .field('secret', 'salah');
    const createReport = await request(app)
      .post('/api/boards/board-x/reports')
      .field('title', 'Lubang');

    expect(confirm.status).toBe(401);
    expect(wrongSecret.status).toBe(404);
    expect(createReport.status).toBe(400);
  });
});

describe('Privasi pelapor', () => {
  async function setup() {
    const owner = await createUser({ email: 'owner@example.com', name: 'Pemilik' });
    const reporter = await createUser({
      email: 'rahasia.pelapor@example.com',
      name: 'Nama Rahasia',
    });
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'rahasia123' })
      .expect(200);
    const board = await prisma.board.create({
      data: {
        slug: 'board-x',
        name: 'Board X',
        city: 'Kota Surabaya',
        type: 'ROAD',
        description: 'Deskripsi Board uji yang cukup panjang.',
        ownerId: owner.id,
        members: { create: { userId: owner.id, role: 'OWNER', status: 'ACTIVE' } },
        categories: { create: [{ name: 'Lainnya', isDefault: true }] },
      },
      include: { categories: true },
    });
    const base = {
      boardId: board.id,
      categoryId: board.categories[0].id,
      description: 'Deskripsi laporan uji yang cukup panjang.',
      locationDetail: 'Lokasi',
      severity: 'LOW',
      ipHash: 'f'.repeat(64),
      trackingSecretHash: sha256('rahasia'),
    };
    const anonymous = await prisma.report.create({
      data: {
        ...base,
        title: 'Anonim',
        userId: reporter.id,
        isAnonymous: true,
        trackingCode: generateTrackingCode(),
      },
    });
    const guest = await prisma.report.create({
      data: {
        ...base,
        title: 'Tamu',
        guestTokenHash: 'e'.repeat(64),
        trackingCode: generateTrackingCode(),
      },
    });
    await prisma.reportEvent.create({
      data: {
        reportId: anonymous.id,
        toStatus: 'NEW',
        actorType: 'REPORTER',
        actorId: null,
        note: 'Laporan dibuat',
      },
    });
    return { agent, board, anonymous, guest };
  }

  function expectNoLeak(body) {
    const text = JSON.stringify(body);
    expect(text).not.toContain('Nama Rahasia');
    expect(text).not.toContain('rahasia.pelapor@example.com');
    expect(text).not.toContain('f'.repeat(64));
    expect(text).not.toContain('e'.repeat(64));
    for (const key of SENSITIVE_KEYS) expect(text).not.toContain(`"${key}"`);
  }

  it('identitas pelapor anonim dan tamu tidak bocor ke publik maupun Penindak', async () => {
    const { agent, board, anonymous, guest } = await setup();

    const responses = await Promise.all([
      request(app).get(`/api/reports/${anonymous.id}`),
      request(app).get(`/api/reports/${guest.id}`),
      request(app).get(`/api/boards/${board.slug}/reports`),
      request(app).get('/api/feed/home'),
      agent.get(`/api/reports/${anonymous.id}`),
      agent.get(`/api/boards/${board.slug}/queue`),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(200);
      expectNoLeak(res.body);
    }
    expect(responses[0].body.data.reporter).toBeNull();
    expect(responses[4].body.data.reporter).toBeNull();
  });
});

describe('Header keamanan dan session', () => {
  it('header keamanan aktif dan x-powered-by tidak ada', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers.ratelimit).toBeDefined();
  });

  it('CSP mengizinkan semua sumber luar yang dipakai frontend', async () => {
    const files = [
      new URL('../../client/index.html', import.meta.url),
      new URL('../../client/src/index.css', import.meta.url),
      new URL('../../client/src/components/reports/TurnstileWidget.jsx', import.meta.url),
    ];
    const origins = new Set();
    for (const file of files) {
      const text = await readFile(file, 'utf8');
      for (const match of text.matchAll(/https:\/\/[a-z0-9.-]+/g)) origins.add(match[0]);
    }
    const res = await request(app).get('/api/health');
    const policy = res.headers['content-security-policy'];

    expect([...origins].sort()).toEqual([
      'https://challenges.cloudflare.com',
      'https://fonts.googleapis.com',
    ]);
    for (const origin of origins) expect(policy).toContain(origin);
    expect(policy).toMatch(/font-src[^;]*https:\/\/fonts\.gstatic\.com/);
    expect(policy).toMatch(/style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  });

  it('cookie session httpOnly dan SameSite Lax', async () => {
    await createUser({ email: 'warga@example.com' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'warga@example.com', password: 'rahasia123' });
    const cookie = res.headers['set-cookie'].find((value) => value.startsWith('tindak.sid='));

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('permintaan tulis dari situs lain ditolak', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://situs-jahat.example')
      .send({ email: 'a@example.com', password: 'rahasia123' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
  });
});
