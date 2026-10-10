import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import {
  refreshHotScores,
  refreshPriorityScores,
  refreshReportScores,
} from '../src/modules/engagement/scores.service.js';
import { runEngagementJobs } from '../src/jobs/index.js';
import { createUser, resetDatabase } from './helpers/db.js';

const DAY = 24 * 60 * 60 * 1000;
let app;

beforeEach(async () => {
  await resetDatabase();
  app = createApp();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

async function loginAs(email, name = 'Pengguna') {
  const user = await createUser({ email, name });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'rahasia123' }).expect(200);
  return { user, agent };
}

async function createBoardAs(agent, name = 'Jalan Rungkut Madya') {
  const res = await agent
    .post('/api/boards')
    .send({
      name,
      city: 'Kota Surabaya',
      type: 'ROAD',
      description: 'Melayani laporan kerusakan sepanjang jalan ini.',
    })
    .expect(201);
  return res.body.data;
}

async function insertReport(board, overrides = {}) {
  const createdAt = overrides.createdAt ?? new Date();
  const report = await prisma.report.create({
    data: {
      boardId: board.id,
      categoryId: board.categories[0].id,
      isAnonymous: true,
      ipHash: 'i'.repeat(64),
      title: 'Laporan uji',
      description: 'Deskripsi laporan uji yang cukup panjang.',
      locationDetail: 'Lokasi uji',
      severity: 'LOW',
      trackingCode: generateTrackingCode(),
      trackingSecretHash: sha256('x'),
      ...overrides,
      createdAt,
    },
  });
  await refreshReportScores(prisma, report.id);
  return report;
}

async function setup() {
  const owner = await loginAs('owner@example.com', 'Pemilik');
  const fan = await loginAs('fan@example.com', 'Pendukung');
  const other = await loginAs('other@example.com', 'Lainnya');
  const board = await createBoardAs(owner.agent);
  return { owner, fan, other, board };
}

async function expectCacheMatchesRows(reportId) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  const supports = await prisma.support.count({ where: { reportId } });
  const reactions = await prisma.reaction.groupBy({
    by: ['type'],
    where: { reportId },
    _count: { _all: true },
  });
  const byType = Object.fromEntries(reactions.map((row) => [row.type, row._count._all]));
  expect(report.supportCount).toBe(supports + 1);
  expect(report.dangerousCount).toBe(byType.DANGEROUS ?? 0);
  expect(report.longStandingCount).toBe(byType.LONG_STANDING ?? 0);
  expect(report.annoyingCount).toBe(byType.ANNOYING ?? 0);
  return report;
}

describe('Dukungan', () => {
  it('satu dukungan per user, idempoten, bisa ditarik, cache konsisten', async () => {
    const { fan, other, board } = await setup();
    const report = await insertReport(board);
    const url = `/api/reports/${report.id}/support`;

    const first = await fan.agent.put(url);
    const again = await fan.agent.put(url);
    await other.agent.put(url).expect(200);

    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({ supportCount: 2, mySupport: true, myReaction: null });
    expect(again.body.data.supportCount).toBe(2);
    expect(await prisma.support.count()).toBe(2);
    await expectCacheMatchesRows(report.id);

    const withdrawn = await fan.agent.delete(url);
    const withdrawnAgain = await fan.agent.delete(url);
    expect(withdrawn.body.data).toMatchObject({ supportCount: 2, mySupport: false });
    expect(withdrawnAgain.body.data.supportCount).toBe(2);
    await expectCacheMatchesRows(report.id);
  });

  it('pelapor tidak bisa mendukung laporannya sendiri, tetapi sudah dihitung 1', async () => {
    const { fan, board } = await setup();
    const report = await insertReport(board, { userId: fan.user.id, isAnonymous: false });

    const res = await fan.agent.put(`/api/reports/${report.id}/support`);
    const detail = await fan.agent.get(`/api/reports/${report.id}`);

    expect(res.status).toBe(403);
    expect(detail.body.data).toMatchObject({
      supportCount: 1,
      isOwnReport: true,
      mySupport: false,
    });
  });

  it('Penindak Board boleh mendukung dan bereaksi', async () => {
    const { owner, board } = await setup();
    const report = await insertReport(board);

    expect((await owner.agent.put(`/api/reports/${report.id}/support`)).status).toBe(200);
    expect(
      (await owner.agent.put(`/api/reports/${report.id}/reaction`).send({ type: 'DANGEROUS' }))
        .status,
    ).toBe(200);
  });

  it('tamu ditolak, laporan tidak ada 404', async () => {
    const { fan, board } = await setup();
    const report = await insertReport(board);

    expect((await request(app).put(`/api/reports/${report.id}/support`)).status).toBe(401);
    expect((await request(app).put(`/api/reports/${report.id}/reaction`)).status).toBe(401);
    expect((await fan.agent.put('/api/reports/999999/support')).status).toBe(404);
  });

  it.each(['RESOLVED', 'REJECTED', 'DUPLICATE'])('terkunci saat %s', async (status) => {
    const { fan, board } = await setup();
    const report = await insertReport(board, { status });

    const support = await fan.agent.put(`/api/reports/${report.id}/support`);
    const reaction = await fan.agent
      .put(`/api/reports/${report.id}/reaction`)
      .send({ type: 'ANNOYING' });
    const detail = await fan.agent.get(`/api/reports/${report.id}`);

    expect(support.status).toBe(409);
    expect(support.body.error.code).toBe('REPORT_LOCKED');
    expect(reaction.status).toBe(409);
    expect(detail.body.data.isEngagementLocked).toBe(true);
  });
});

describe('Reaksi', () => {
  it('satu reaksi per user, bisa diganti dan ditarik, cache konsisten', async () => {
    const { fan, other, board } = await setup();
    const report = await insertReport(board);
    const url = `/api/reports/${report.id}/reaction`;

    const created = await fan.agent.put(url).send({ type: 'DANGEROUS' });
    await other.agent.put(url).send({ type: 'DANGEROUS' });
    const changed = await fan.agent.put(url).send({ type: 'LONG_STANDING' });

    expect(created.body.data).toMatchObject({ myReaction: 'DANGEROUS' });
    expect(changed.body.data).toMatchObject({
      myReaction: 'LONG_STANDING',
      reactionCounts: { DANGEROUS: 1, LONG_STANDING: 1, ANNOYING: 0 },
    });
    expect(await prisma.reaction.count()).toBe(2);
    await expectCacheMatchesRows(report.id);

    const removed = await fan.agent.delete(url);
    expect(removed.body.data).toMatchObject({
      myReaction: null,
      reactionCounts: { DANGEROUS: 1, LONG_STANDING: 0, ANNOYING: 0 },
    });
    await expectCacheMatchesRows(report.id);
  });

  it('menolak tipe tidak dikenal dan field asing', async () => {
    const { fan, board } = await setup();
    const report = await insertReport(board);
    const url = `/api/reports/${report.id}/reaction`;

    expect((await fan.agent.put(url).send({ type: 'LUCU' })).status).toBe(400);
    expect((await fan.agent.put(url).send({ type: 'ANNOYING', count: 9 })).status).toBe(400);
  });

  it('pelapor boleh bereaksi pada laporannya sendiri', async () => {
    const { fan, board } = await setup();
    const report = await insertReport(board, { userId: fan.user.id });

    const res = await fan.agent
      .put(`/api/reports/${report.id}/reaction`)
      .send({ type: 'ANNOYING' });

    expect(res.status).toBe(200);
  });
});

describe('Skor prioritas', () => {
  it('dihitung dari dukungan, reaksi, bahaya, dan hari belum selesai', async () => {
    const { fan, other, board } = await setup();
    const report = await insertReport(board, {
      severity: 'DANGEROUS',
      createdAt: new Date(Date.now() - 3 * DAY - 60_000),
    });
    await fan.agent.put(`/api/reports/${report.id}/support`).expect(200);
    await fan.agent.put(`/api/reports/${report.id}/reaction`).send({ type: 'DANGEROUS' });
    const res = await other.agent
      .put(`/api/reports/${report.id}/reaction`)
      .send({ type: 'LONG_STANDING' });

    expect(res.body.data.priorityScore).toBe(2 + 3 + 2 + 30 + 3 * 2);
  });

  it('berubah saat status berubah dan berhenti menghitung hari saat ditutup', async () => {
    const { owner, board } = await setup();
    const report = await insertReport(board, {
      severity: 'MEDIUM',
      createdAt: new Date(Date.now() - 2 * DAY - 60_000),
    });
    expect((await prisma.report.findUnique({ where: { id: report.id } })).priorityScore).toBe(
      1 + 10 + 4,
    );

    await owner.agent
      .post(`/api/reports/${report.id}/reject`)
      .send({ reason: 'FALSE_REPORT' })
      .expect(200);
    const closed = await prisma.report.findUnique({ where: { id: report.id } });
    expect(closed.priorityScore).toBe(1 + 10 + 4);

    expect(await refreshPriorityScores(new Date(Date.now() + 10 * DAY))).toBe(0);
    expect((await prisma.report.findUnique({ where: { id: report.id } })).priorityScore).toBe(
      closed.priorityScore,
    );
  });

  it('job harian menambah faktor hari untuk laporan aktif', async () => {
    const { board } = await setup();
    const report = await insertReport(board);

    expect(await refreshPriorityScores(new Date(Date.now() + 5 * DAY + 60_000))).toBe(1);
    expect((await prisma.report.findUnique({ where: { id: report.id } })).priorityScore).toBe(
      1 + 5 * 2,
    );
  });
});

describe('Skor hot dan urutan feed', () => {
  async function seedFeed() {
    const ctx = await setup();
    const ids = {};
    ids.oldPopular = (
      await insertReport(ctx.board, {
        title: 'Lama tapi ramai',
        createdAt: new Date(Date.now() - 5 * DAY),
      })
    ).id;
    ids.newest = (await insertReport(ctx.board, { title: 'Paling baru' })).id;
    ids.danger = (
      await insertReport(ctx.board, {
        title: 'Berbahaya',
        severity: 'DANGEROUS',
        createdAt: new Date(Date.now() - DAY),
      })
    ).id;
    ids.resolved = (
      await insertReport(ctx.board, {
        title: 'Sudah selesai',
        status: 'RESOLVED',
        resolvedAt: new Date(),
        createdAt: new Date(Date.now() - 2 * DAY),
      })
    ).id;
    await ctx.fan.agent.put(`/api/reports/${ids.oldPopular}/support`).expect(200);
    await ctx.other.agent.put(`/api/reports/${ids.oldPopular}/support`).expect(200);
    await ctx.fan.agent.put(`/api/reports/${ids.oldPopular}/reaction`).send({ type: 'ANNOYING' });
    return { ...ctx, ids };
  }

  const titles = (res) => res.body.data.map((item) => item.title);

  it('Board feed: hot, priority, new, dan resolved', async () => {
    const { board } = await seedFeed();
    const base = `/api/boards/${board.slug}/reports`;

    const hot = await request(app).get(`${base}?sort=hot`);
    const priority = await request(app).get(`${base}?sort=priority`);
    const newest = await request(app).get(`${base}?sort=new`);
    const resolved = await request(app).get(`${base}?sort=resolved`);

    expect(titles(hot)[0]).toBe('Lama tapi ramai');
    expect(titles(priority)).toEqual([
      'Berbahaya',
      'Lama tapi ramai',
      'Sudah selesai',
      'Paling baru',
    ]);
    expect(titles(newest)[0]).toBe('Paling baru');
    expect(titles(resolved)).toEqual(['Sudah selesai']);
    expect(hot.body.data[0]).toMatchObject({
      supportCount: 3,
      reactionCounts: { ANNOYING: 1 },
      mySupport: false,
      board: { verification: 'COMMUNITY' },
    });
  });

  it('mySupport dan myReaction terisi untuk user login', async () => {
    const { board, fan, ids } = await seedFeed();

    const res = await fan.agent.get(`/api/boards/${board.slug}/reports?sort=hot`);
    const detail = await fan.agent.get(`/api/reports/${ids.oldPopular}`);

    expect(res.body.data[0]).toMatchObject({ mySupport: true, myReaction: 'ANNOYING' });
    expect(res.body.data[1]).toMatchObject({ mySupport: false, myReaction: null });
    expect(detail.body.data).toMatchObject({ mySupport: true, myReaction: 'ANNOYING' });
  });

  it('antrean Penindak default urut prioritas', async () => {
    const { owner, board } = await seedFeed();

    const res = await owner.agent.get(`/api/boards/${board.slug}/queue`);
    const newest = await owner.agent.get(`/api/boards/${board.slug}/queue?sort=new`);

    expect(titles(res)[0]).toBe('Berbahaya');
    expect(titles(newest)[0]).toBe('Paling baru');
  });

  it('hot hanya menghitung 48 jam terakhir dan job memperbaruinya', async () => {
    const { ids } = await seedFeed();
    await prisma.support.updateMany({ data: { createdAt: new Date(Date.now() - 3 * DAY) } });
    await prisma.reaction.updateMany({ data: { updatedAt: new Date(Date.now() - 3 * DAY) } });

    expect((await prisma.report.findUnique({ where: { id: ids.oldPopular } })).hotScore).toBe(3);
    expect(await refreshHotScores()).toBe(1);
    expect((await prisma.report.findUnique({ where: { id: ids.oldPopular } })).hotScore).toBe(0);
    expect(await runEngagementJobs()).toMatchObject({ hotScores: 0 });
  });
});

describe('Beranda dan Board populer', () => {
  it('tab hot berisi semua Board, tab following hanya Board yang diikuti', async () => {
    const { owner, fan, board } = await setup();
    const second = await createBoardAs(owner.agent, 'Taman Bungkul');
    await insertReport(board, { title: 'Di Rungkut' });
    await insertReport(second, { title: 'Di Bungkul' });
    await fan.agent.post(`/api/boards/${second.slug}/follow`).expect(200);

    const hot = await request(app).get('/api/feed/home');
    const following = await fan.agent.get('/api/feed/home?tab=following');

    expect(hot.body.meta.total).toBe(2);
    expect(hot.body.data[0].board).toMatchObject({ verification: 'COMMUNITY' });
    expect(following.body.data.map((item) => item.title)).toEqual(['Di Bungkul']);
    expect((await request(app).get('/api/feed/home?tab=following')).status).toBe(401);
    expect((await request(app).get('/api/feed/home?tab=lain')).status).toBe(400);
  });

  it('tab nearby hanya berisi laporan dari Board di kota yang dipilih', async () => {
    const { owner, board } = await setup();
    const jakarta = await owner.agent
      .post('/api/boards')
      .send({
        name: 'Gedung Besar Jakarta',
        city: 'Kota Administrasi Jakarta Selatan',
        type: 'OFFICE',
        description: 'Melayani laporan kerusakan di gedung ini.',
      })
      .expect(201);
    await insertReport(board, { title: 'Di Surabaya' });
    await insertReport(jakarta.body.data, { title: 'Di Jakarta' });

    const nearby = await request(app).get(
      `/api/feed/home?tab=nearby&city=${encodeURIComponent('Kota Surabaya')}`,
    );
    const noCity = await request(app).get('/api/feed/home?tab=nearby');
    const unknownCity = await request(app).get('/api/feed/home?tab=nearby&city=Gotham');

    expect(nearby.status).toBe(200);
    expect(nearby.body.data.map((item) => item.title)).toEqual(['Di Surabaya']);
    expect(noCity.status).toBe(400);
    expect(noCity.body.error.details[0].message).toBe(
      'Pilih kotamu dulu untuk melihat laporan di sekitarmu',
    );
    expect(unknownCity.status).toBe(400);
  });

  it('Board populer dan pencarian kosong diurutkan dari pengikut dan aktivitas', async () => {
    const { owner, fan, other, board } = await setup();
    const quiet = await createBoardAs(owner.agent, 'Board Sepi');
    const busy = await createBoardAs(owner.agent, 'Board Ramai');
    await prisma.board.update({ where: { id: quiet.id }, data: { verification: 'OFFICIAL' } });
    await fan.agent.post(`/api/boards/${busy.slug}/follow`).expect(200);
    await other.agent.post(`/api/boards/${busy.slug}/follow`).expect(200);
    await fan.agent.post(`/api/boards/${board.slug}/follow`).expect(200);
    await insertReport(board);

    const popular = await request(app).get('/api/boards/popular?limit=2');
    const search = await request(app).get('/api/boards/search');

    expect(popular.body.data.map((item) => item.name)).toEqual([
      'Board Ramai',
      'Jalan Rungkut Madya',
    ]);
    expect(popular.body.data[0]).toMatchObject({ followerCount: 2, verification: 'COMMUNITY' });
    expect(search.body.data.map((item) => item.name)).toEqual([
      'Board Ramai',
      'Jalan Rungkut Madya',
      'Board Sepi',
    ]);
  });
});

describe('Penanggung jawab', () => {
  it('detail laporan memuat pemilik Board untuk pilihan penanggung jawab', async () => {
    const { owner, board } = await setup();
    const report = await insertReport(board);

    const res = await owner.agent.get(`/api/reports/${report.id}`);
    const assigned = await owner.agent
      .post(`/api/reports/${report.id}/process`)
      .send({ assigneeId: owner.user.id });

    expect(res.body.data.board.owner).toEqual({
      id: owner.user.id,
      name: 'Pemilik',
      avatarUrl: null,
    });
    expect(assigned.body.data.assignee.id).toBe(owner.user.id);
  });
});
