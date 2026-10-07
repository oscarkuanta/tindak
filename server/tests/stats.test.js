import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { recomputeBoardTrust } from '../src/modules/trust/trust.service.js';
import { weekStartOf, weeksBetween } from '../src/modules/stats/stats.service.js';
import { csvCell } from '../src/modules/stats/export.service.js';
import { createUser, resetDatabase } from './helpers/db.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
let app;

beforeEach(async () => {
  await resetDatabase();
  app = createApp();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

async function loginAs(email, overrides = {}) {
  const user = await createUser({ email, name: email.split('@')[0], ...overrides });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'rahasia123' }).expect(200);
  return { user, agent };
}

async function createReport(board, { daysAgo, category = 0, events = [], dueInHours, ...data }) {
  const createdAt = new Date(Date.now() - daysAgo * DAY);
  const report = await prisma.report.create({
    data: {
      boardId: board.id,
      categoryId: board.categories[category].id,
      title: `Laporan ${daysAgo} hari`,
      description: 'Deskripsi laporan uji yang cukup panjang.',
      locationDetail: 'Gedung A',
      severity: 'LOW',
      trackingCode: generateTrackingCode(),
      trackingSecretHash: sha256('x'),
      createdAt,
      ...data,
      ...(dueInHours !== undefined && {
        dueAt: new Date(createdAt.getTime() + dueInHours * HOUR),
      }),
    },
  });
  let from = 'NEW';
  for (const { to, afterHours, actor = null, actorType = 'HANDLER' } of events) {
    await prisma.reportEvent.create({
      data: {
        reportId: report.id,
        fromStatus: from,
        toStatus: to,
        actorType,
        actorId: actor,
        createdAt: new Date(createdAt.getTime() + afterHours * HOUR),
      },
    });
    from = to;
  }
  return report;
}

async function setup() {
  const owner = await loginAs('owner@example.com');
  const handler = await loginAs('handler@example.com');
  const res = await owner.agent
    .post('/api/boards')
    .send({
      name: 'Jalan Rungkut Madya',
      city: 'Kota Surabaya',
      type: 'ROAD',
      description: 'Melayani laporan kerusakan sepanjang Jalan Rungkut Madya.',
    })
    .expect(201);
  const board = res.body.data;
  await prisma.boardMember.create({
    data: { boardId: board.id, userId: handler.user.id, role: 'HANDLER', status: 'ACTIVE' },
  });
  const h = handler.user.id;
  const o = owner.user.id;
  const reports = {
    r1: await createReport(board, {
      daysAgo: 10,
      status: 'RESOLVED',
      events: [
        { to: 'IN_PROGRESS', afterHours: 2, actor: h },
        { to: 'AWAITING_CONFIRMATION', afterHours: 10, actor: h },
        { to: 'RESOLVED', afterHours: 24, actorType: 'REPORTER' },
      ],
    }),
    r2: await createReport(board, {
      daysAgo: 6,
      severity: 'DANGEROUS',
      dueInHours: 48,
      status: 'AWAITING_CONFIRMATION',
      events: [
        { to: 'IN_PROGRESS', afterHours: 1, actor: o },
        { to: 'AWAITING_CONFIRMATION', afterHours: 20, actor: o },
      ],
    }),
    r3: await createReport(board, {
      daysAgo: 5,
      category: 1,
      severity: 'DANGEROUS',
      dueInHours: 48,
    }),
    r4: await createReport(board, {
      daysAgo: 20,
      category: 1,
      status: 'REJECTED',
      events: [{ to: 'REJECTED', afterHours: 8 * 24, actor: h }],
    }),
    r5: await createReport(board, {
      daysAgo: 15,
      severity: 'DANGEROUS',
      dueInHours: 48,
      status: 'AWAITING_CONFIRMATION',
      events: [
        { to: 'IN_PROGRESS', afterHours: 1, actor: h },
        { to: 'AWAITING_CONFIRMATION', afterHours: 60, actor: h },
      ],
    }),
    r6: await createReport(board, { daysAgo: 40, category: 1 }),
    r7: await createReport(board, { daysAgo: 3, removedAt: new Date(), isHidden: true }),
    r8: await createReport(board, { daysAgo: 1 }),
  };
  return { owner, handler, board, reports };
}

describe('GET /api/boards/:slug/stats', () => {
  it('menghitung angka statistik 30 hari dengan benar', async () => {
    const { owner, handler, board, reports } = await setup();
    const fans = [];
    for (const stars of [5, 3]) {
      const fan = await createUser({ email: `fan${stars}@example.com` });
      await prisma.boardRating.create({ data: { boardId: board.id, userId: fan.id, stars } });
      fans.push(fan);
    }
    await recomputeBoardTrust(board.id);

    const res = await owner.agent.get(`/api/boards/${board.slug}/stats`);
    const data = res.body.data;

    expect(res.status).toBe(200);
    expect(data.range).toBe('30d');
    expect(data.totals).toEqual({ total: 6, active: 4, resolved: 1, rejected: 1 });
    expect(data.statusCounts).toMatchObject({
      NEW: 2,
      AWAITING_CONFIRMATION: 2,
      RESOLVED: 1,
      REJECTED: 1,
      IN_PROGRESS: 0,
    });
    expect(data.handling).toEqual({ handledCount: 3, averageHours: 30 });
    expect(data.responseRate).toBe(75);
    expect(data.dangerous).toMatchObject({ total: 3, onTime: 1, late: 2, onTimeRate: 33 });
    expect(data.dangerous.lateReports.map((item) => item.id)).toEqual([
      reports.r5.id,
      reports.r3.id,
    ]);
    expect(data.dangerous.lateReports[0].lateHours).toBe(12);
    expect(data.categories.slice(0, 2)).toEqual([
      { id: board.categories[0].id, name: board.categories[0].name, count: 4 },
      { id: board.categories[1].id, name: board.categories[1].name, count: 2 },
    ]);
    expect(data.categories.slice(2).every((item) => item.count === 0)).toBe(true);
    expect(data.weeklyTrend.reduce((sum, week) => sum + week.incoming, 0)).toBe(6);
    expect(data.weeklyTrend.reduce((sum, week) => sum + week.resolved, 0)).toBe(1);
    expect(data.oldestActive.map((item) => item.id)).toEqual([
      reports.r6.id,
      reports.r5.id,
      reports.r2.id,
      reports.r3.id,
      reports.r8.id,
    ]);
    expect(data.oldestActive[0]).toMatchObject({
      ageDays: 40,
      category: { name: expect.any(String) },
    });
    expect(data.handlers).toEqual([
      {
        userId: handler.user.id,
        name: 'handler',
        role: 'HANDLER',
        processed: 2,
        resolved: 2,
        averageHours: 35,
      },
      {
        userId: owner.user.id,
        name: 'owner',
        role: 'OWNER',
        processed: 1,
        resolved: 1,
        averageHours: 20,
      },
    ]);
    expect(data.rating).toMatchObject({
      ratingCount: 2,
      averageStars: 4,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
      newRatings: 2,
      trustLabel: 'NEW',
    });
  });

  it('rentang 7d dan 90d mengubah cakupan laporan', async () => {
    const { owner, board } = await setup();

    const week = await owner.agent.get(`/api/boards/${board.slug}/stats?range=7d`);
    const quarter = await owner.agent.get(`/api/boards/${board.slug}/stats?range=90d`);

    expect(week.body.data.totals.total).toBe(3);
    expect(week.body.data.handling).toEqual({ handledCount: 1, averageHours: 20 });
    expect(week.body.data.weeklyTrend.length).toBeGreaterThanOrEqual(2);
    expect(quarter.body.data.totals.total).toBe(7);
    expect(quarter.body.data.weeklyTrend.length).toBeGreaterThanOrEqual(13);
  });

  it('Penindak boleh melihat tanpa kinerja per Penindak', async () => {
    const { handler, board } = await setup();

    const res = await handler.agent.get(`/api/boards/${board.slug}/stats`);

    expect(res.status).toBe(200);
    expect(res.body.data.handlers).toBeNull();
    expect(res.body.data.totals.total).toBe(6);
  });

  it('hak akses dan validasi', async () => {
    const { owner, board } = await setup();
    const outsider = await loginAs('warga@example.com');
    const admin = await loginAs('admin@tindak.test', { role: 'ADMIN' });

    expect((await request(app).get(`/api/boards/${board.slug}/stats`)).status).toBe(401);
    expect((await outsider.agent.get(`/api/boards/${board.slug}/stats`)).status).toBe(403);
    expect((await admin.agent.get(`/api/boards/${board.slug}/stats`)).status).toBe(403);
    const invalid = await owner.agent.get(`/api/boards/${board.slug}/stats?range=1y`);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details[0].message).toBe('Rentang waktu harus 7d, 30d, atau 90d');
    expect((await owner.agent.get('/api/boards/tidak-ada/stats')).status).toBe(404);
  });
});

describe('GET /api/boards/:slug/export', () => {
  it('mengekspor CSV laporan dalam rentang tanpa data pelapor', async () => {
    const { owner, board, reports } = await setup();
    await prisma.report.update({
      where: { id: reports.r8.id },
      data: { title: '=HYPERLINK("http://jahat")' },
    });

    const res = await owner.agent.get(`/api/boards/${board.slug}/export?format=csv&range=30d`);
    const lines = res.text
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="statistik-${board.slug}-30d.csv"`,
    );
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe(
      'ID,Judul,Kategori,Tingkat Bahaya,Status,Dibuat (WIB),Batas Waktu (WIB),Ditandai Selesai (WIB),Lokasi,Dukungan',
    );
    expect(lines).toHaveLength(7);
    expect(lines[1]).toContain(`${reports.r8.id},"'=HYPERLINK(""http://jahat"")"`);
    expect(res.text).not.toContain(reports.r7.trackingCode);
    expect(res.text).not.toContain(String(reports.r7.id) + ',');
  });

  it('hak akses dan format', async () => {
    const { owner, board } = await setup();
    const outsider = await loginAs('warga@example.com');

    expect((await request(app).get(`/api/boards/${board.slug}/export`)).status).toBe(401);
    expect((await outsider.agent.get(`/api/boards/${board.slug}/export`)).status).toBe(403);
    expect((await owner.agent.get(`/api/boards/${board.slug}/export?format=xls`)).status).toBe(400);
  });
});

describe('Fungsi bantu statistik', () => {
  it('awal minggu Senin waktu WIB', () => {
    expect(weekStartOf('2026-10-07T00:00:00.000Z')).toBe('2026-10-05');
    expect(weekStartOf('2026-10-11T16:00:00.000Z')).toBe('2026-10-05');
    expect(weekStartOf('2026-10-11T18:00:00.000Z')).toBe('2026-10-12');
    expect(
      weeksBetween(new Date('2026-09-16T00:00:00.000Z'), new Date('2026-10-07T00:00:00.000Z')),
    ).toEqual(['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05']);
  });

  it('csvCell menetralkan rumus dan memberi tanda kutip', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('-5')).toBe("'-5");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('kata "kutip"')).toBe('"kata ""kutip"""');
    expect(csvCell(null)).toBe('');
    expect(csvCell(12)).toBe('12');
  });
});
