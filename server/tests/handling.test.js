import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { uploadDir } from '../src/lib/storage.js';
import { scoreImage } from '../src/lib/nsfw.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { autoConfirmReports } from '../src/modules/reports/handling.service.js';
import { markInactiveBoards } from '../src/modules/boards/boards.service.js';
import { runScheduledJobs } from '../src/jobs/index.js';
import { createUser, resetDatabase } from './helpers/db.js';
import { jpegWithExif } from './helpers/images.js';

vi.mock('../src/lib/nsfw.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, scoreImage: vi.fn(async () => null) };
});

const SECRET = 'rahasia-lacak-uji';
const DAY = 24 * 60 * 60 * 1000;

let app;
let photo;

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(scoreImage).mockReset().mockResolvedValue(null);
  app = createApp();
  photo ??= await jpegWithExif({ width: 400, height: 300 });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
  await rm(uploadDir, { recursive: true, force: true });
});

async function loginAs(email, name = 'Pengguna') {
  const user = await createUser({ email, name });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'rahasia123' }).expect(200);
  return { user, agent };
}

async function setup() {
  const owner = await loginAs('owner@example.com', 'Pak Hadi');
  const handler = await loginAs('handler@example.com', 'Bu Rina');
  const reporter = await loginAs('reporter@example.com', 'Budi');
  const stranger = await loginAs('stranger@example.com', 'Orang Lain');
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
  return { owner, handler, reporter, stranger, board, categoryId: board.categories[0].id };
}

async function insertReport(ctx, overrides = {}) {
  const createdAt = overrides.createdAt ?? new Date();
  return prisma.report.create({
    data: {
      boardId: ctx.board.id,
      categoryId: ctx.categoryId,
      userId: null,
      isAnonymous: true,
      guestTokenHash: 'g'.repeat(64),
      ipHash: 'i'.repeat(64),
      title: 'Lubang besar di depan Indomaret',
      description: 'Lubang selebar satu meter di tengah jalan.',
      locationDetail: 'Depan Indomaret',
      severity: 'MEDIUM',
      trackingCode: generateTrackingCode(),
      trackingSecretHash: sha256(SECRET),
      ...overrides,
      createdAt,
      events: {
        create: { toStatus: 'NEW', actorType: 'REPORTER', note: 'Laporan dibuat', createdAt },
      },
    },
  });
}

const path = (report, action) => `/api/reports/${report.id}/${action}`;

function resolveWithPhoto(agent, report, note = 'Lubang sudah ditambal aspal') {
  return agent
    .post(path(report, 'resolve'))
    .field('note', note)
    .attach('photos', photo, { filename: 'sesudah.jpg', contentType: 'image/jpeg' });
}

function guest(report, extra = {}) {
  return { trackingCode: report.trackingCode, secret: SECRET, ...extra };
}

describe('Alur lengkap', () => {
  it('pelapor login: Baru → Diproses → Menunggu Konfirmasi → Selesai', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx, { userId: ctx.reporter.user.id, isAnonymous: false });
    const before = (await prisma.board.findUnique({ where: { id: ctx.board.id } }))
      .lastHandlerActivityAt;

    const initial = await ctx.handler.agent.get(`/api/reports/${report.id}`);
    expect(initial.body.data.allowedActions).toEqual([
      'PROCESS',
      'REQUEST_INFO',
      'REJECT',
      'DUPLICATE',
    ]);

    const processed = await ctx.handler.agent.post(path(report, 'process')).send({});
    expect(processed.status).toBe(200);
    expect(processed.body.data).toMatchObject({
      status: 'IN_PROGRESS',
      assignee: null,
      allowedActions: ['RESOLVE', 'REJECT', 'DUPLICATE'],
    });

    const resolved = await resolveWithPhoto(ctx.handler.agent, report);
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe('AWAITING_CONFIRMATION');
    expect(resolved.body.data.media.map((item) => item.kind)).toEqual(['AFTER']);
    expect(resolved.body.data.allowedActions).toEqual([]);

    const asReporter = await ctx.reporter.agent.get(`/api/reports/${report.id}`);
    expect(asReporter.body.data.allowedActions).toEqual(['CONFIRM']);

    const confirmed = await ctx.reporter.agent
      .post(path(report, 'confirm'))
      .send({ result: 'resolved' });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data).toMatchObject({ status: 'RESOLVED', allowedActions: [] });
    expect(confirmed.body.data.timeline.map((entry) => [entry.toStatus, entry.actorType])).toEqual([
      ['NEW', 'REPORTER'],
      ['IN_PROGRESS', 'HANDLER'],
      ['AWAITING_CONFIRMATION', 'HANDLER'],
      ['RESOLVED', 'REPORTER'],
    ]);
    expect(confirmed.body.data.timeline[1].actor).toEqual({
      id: ctx.handler.user.id,
      name: 'Bu Rina',
    });

    const stored = await prisma.report.findUnique({ where: { id: report.id } });
    expect(stored.resolvedAt).not.toBeNull();
    const board = await prisma.board.findUnique({ where: { id: ctx.board.id } });
    expect(board.lastHandlerActivityAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('tamu dengan Kode Lacak: Perlu Info, jawab, buka ulang dua kali, lalu pelapor tidak puas', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx);

    await ctx.owner.agent
      .post(path(report, 'request-info'))
      .send({ question: 'Patokan terdekat apa?' })
      .expect(200);

    const tracked = await request(app).get(`/api/track/${report.trackingCode}?secret=${SECRET}`);
    expect(tracked.body.data).toMatchObject({
      status: 'NEED_INFO',
      allowedActions: ['ANSWER_INFO'],
      infoRequest: {
        question: 'Patokan terdekat apa?',
        answer: null,
        askedBy: { name: 'Pak Hadi' },
      },
    });

    const answered = await request(app)
      .post(path(report, 'answer-info'))
      .send(guest(report, { answer: 'Depan rumah nomor 12' }));
    expect(answered.status).toBe(200);
    expect(answered.body.data).toMatchObject({
      status: 'NEW',
      infoRequest: { answer: 'Depan rumah nomor 12' },
    });
    const again = await request(app)
      .post(path(report, 'answer-info'))
      .send(guest(report, { answer: 'Lagi' }));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INFO_ALREADY_ANSWERED');

    for (const round of [1, 2]) {
      await ctx.handler.agent.post(path(report, 'process')).send({}).expect(200);
      await resolveWithPhoto(ctx.handler.agent, report).expect(200);
      const reopened = await request(app)
        .post(path(report, 'confirm'))
        .field('result', 'not_resolved')
        .field('note', `Masih berlubang (${round})`)
        .field('trackingCode', report.trackingCode)
        .field('secret', SECRET)
        .attach('photos', photo, { filename: 'masih.jpg', contentType: 'image/jpeg' });
      expect(reopened.status).toBe(200);
      expect(reopened.body.data).toMatchObject({ status: 'REOPENED', reopenCount: round });
    }

    await ctx.handler.agent.post(path(report, 'process')).send({}).expect(200);
    await resolveWithPhoto(ctx.handler.agent, report).expect(200);
    const last = await request(app)
      .post(path(report, 'confirm'))
      .send(guest(report, { result: 'not_resolved', note: 'Tetap belum beres' }));

    expect(last.status).toBe(200);
    expect(last.body.data).toMatchObject({
      status: 'RESOLVED',
      reopenCount: 2,
      reporterNotSatisfied: true,
    });
    expect(last.body.data.timeline.at(-1)).toMatchObject({
      toStatus: 'RESOLVED',
      actorType: 'REPORTER',
      actor: null,
      note: 'Pelapor tidak puas: Tetap belum beres',
    });
    expect(last.body.data.media.filter((item) => item.kind === 'EXTRA')).toHaveLength(2);
  });

  it('REOPENED bisa langsung ditandai selesai lagi', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx, { status: 'REOPENED', reopenCount: 1 });

    const res = await resolveWithPhoto(ctx.owner.agent, report);

    expect(res.body.data.status).toBe('AWAITING_CONFIRMATION');
  });
});

describe('Transisi tidak sah', () => {
  it.each([
    ['NEW', 'resolve'],
    ['RESOLVED', 'process'],
    ['IN_PROGRESS', 'request-info'],
    ['REJECTED', 'reject'],
    ['DUPLICATE', 'process'],
    ['AWAITING_CONFIRMATION', 'process'],
  ])('status %s tidak bisa %s', async (status, action) => {
    const ctx = await setup();
    const report = await insertReport(ctx, { status });
    const bodies = {
      process: {},
      'request-info': { question: 'Apa?' },
      reject: { reason: 'FALSE_REPORT' },
    };

    const res =
      action === 'resolve'
        ? await resolveWithPhoto(ctx.owner.agent, report)
        : await ctx.owner.agent.post(path(report, action)).send(bodies[action]);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('konfirmasi hanya saat Menunggu Konfirmasi', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx, { status: 'IN_PROGRESS' });

    const res = await request(app)
      .post(path(report, 'confirm'))
      .send(guest(report, { result: 'resolved' }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('dua Penindak memproses bersamaan: satu berhasil, satu 409', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx);

    const results = await Promise.all([
      ctx.owner.agent.post(path(report, 'process')).send({}),
      ctx.handler.agent.post(path(report, 'process')).send({}),
    ]);

    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(await prisma.reportEvent.count({ where: { reportId: report.id } })).toBe(2);
  });
});

describe('Hak akses', () => {
  it('menolak tamu, user lain, dan Penindak yang masih diundang', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx);
    const invited = await loginAs('invited@example.com');
    await prisma.boardMember.create({
      data: { boardId: ctx.board.id, userId: invited.user.id, role: 'HANDLER', status: 'INVITED' },
    });

    expect((await request(app).post(path(report, 'process')).send({})).status).toBe(401);
    expect((await ctx.stranger.agent.post(path(report, 'process')).send({})).status).toBe(403);
    expect((await invited.agent.post(path(report, 'process')).send({})).status).toBe(403);
    expect(
      (await ctx.stranger.agent.get(`/api/reports/${report.id}`)).body.data.allowedActions,
    ).toEqual([]);
    expect((await ctx.owner.agent.post('/api/reports/999999/process').send({})).status).toBe(404);
  });

  it('penanggung jawab harus Penindak aktif Board ini', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx);

    const wrong = await ctx.owner.agent
      .post(path(report, 'process'))
      .send({ assigneeId: ctx.stranger.user.id });
    const right = await ctx.owner.agent
      .post(path(report, 'process'))
      .send({ assigneeId: ctx.handler.user.id });

    expect(wrong.status).toBe(404);
    expect(wrong.body.error.code).toBe('HANDLER_NOT_FOUND');
    expect(right.body.data.assignee.id).toBe(ctx.handler.user.id);

    await prisma.report.update({ where: { id: report.id }, data: { status: 'REOPENED' } });
    const kept = await ctx.owner.agent.post(path(report, 'process')).send({});
    expect(kept.body.data.assignee.id).toBe(ctx.handler.user.id);
    await prisma.report.update({ where: { id: report.id }, data: { status: 'REOPENED' } });
    const cleared = await ctx.owner.agent.post(path(report, 'process')).send({ assigneeId: null });
    expect(cleared.body.data.assignee).toBeNull();
  });

  it('pelapor: secret salah 404, tanpa login 401, user lain 403', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx, {
      status: 'AWAITING_CONFIRMATION',
      userId: ctx.reporter.user.id,
    });
    const body = { result: 'resolved' };

    const wrongSecret = await request(app)
      .post(path(report, 'confirm'))
      .send({ ...body, trackingCode: report.trackingCode, secret: 'salah' });
    const wrongCode = await request(app)
      .post(path(report, 'confirm'))
      .send({ ...body, trackingCode: 'ABCDEFGH', secret: SECRET });
    const anonymous = await request(app).post(path(report, 'confirm')).send(body);
    const stranger = await ctx.stranger.agent.post(path(report, 'confirm')).send(body);
    const halfCredentials = await request(app)
      .post(path(report, 'confirm'))
      .send({ ...body, trackingCode: report.trackingCode });

    expect(wrongSecret.status).toBe(404);
    expect(wrongCode.status).toBe(404);
    expect(anonymous.status).toBe(401);
    expect(stranger.status).toBe(403);
    expect(halfCredentials.status).toBe(400);
    expect((await prisma.report.findUnique({ where: { id: report.id } })).status).toBe(
      'AWAITING_CONFIRMATION',
    );
  });
});

describe('Tolak, duplikat, dan selesai', () => {
  it('alasan Lainnya wajib catatan, alasan tercatat di timeline', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx);

    const noNote = await ctx.owner.agent.post(path(report, 'reject')).send({ reason: 'OTHER' });
    const ok = await ctx.owner.agent
      .post(path(report, 'reject'))
      .send({ reason: 'OUT_OF_SCOPE', note: 'Bukan wilayah RT ini' });

    expect(noNote.status).toBe(400);
    expect(noNote.body.error.details[0].field).toBe('note');
    expect(ok.body.data.status).toBe('REJECTED');
    expect(ok.body.data.timeline.at(-1)).toMatchObject({
      reason: 'OUT_OF_SCOPE',
      note: 'Bukan wilayah RT ini',
    });
  });

  it('duplikat hanya ke laporan aktif lain di Board sama yang bukan duplikat', async () => {
    const ctx = await setup();
    const other = await ctx.owner.agent
      .post('/api/boards')
      .send({
        name: 'Board Lain',
        city: 'Kota Surabaya',
        type: 'ROAD',
        description: 'Board lain untuk menguji duplikat laporan.',
      })
      .expect(201);
    const report = await insertReport(ctx);
    const parent = await insertReport(ctx, { title: 'Induk' });
    const resolvedParent = await insertReport(ctx, { status: 'RESOLVED' });
    const duplicateParent = await insertReport(ctx, { status: 'DUPLICATE', parentId: parent.id });
    const otherBoard = await insertReport(
      { board: other.body.data, categoryId: other.body.data.categories[0].id },
      { title: 'Di Board lain' },
    );

    for (const parentId of [
      report.id,
      resolvedParent.id,
      duplicateParent.id,
      otherBoard.id,
      999999,
    ]) {
      const res = await ctx.owner.agent.post(path(report, 'duplicate')).send({ parentId });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_DUPLICATE');
    }

    const ok = await ctx.owner.agent.post(path(report, 'duplicate')).send({ parentId: parent.id });
    expect(ok.body.data).toMatchObject({
      status: 'DUPLICATE',
      parent: { id: parent.id, title: 'Induk' },
    });
  });

  it('Tandai Selesai wajib foto dan catatan', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx, { status: 'IN_PROGRESS' });

    const noPhoto = await ctx.owner.agent.post(path(report, 'resolve')).field('note', 'Sudah');
    const noNote = await ctx.owner.agent
      .post(path(report, 'resolve'))
      .attach('photos', photo, { filename: 'a.jpg', contentType: 'image/jpeg' });

    expect(noPhoto.status).toBe(400);
    expect(noPhoto.body.error.details[0].field).toBe('photos');
    expect(noNote.status).toBe(400);
    expect(noNote.body.error.details[0].field).toBe('note');
  });

  it('Sudah Beres tidak boleh membawa foto', async () => {
    const ctx = await setup();
    const report = await insertReport(ctx, { status: 'AWAITING_CONFIRMATION' });

    const res = await request(app)
      .post(path(report, 'confirm'))
      .field('result', 'resolved')
      .field('trackingCode', report.trackingCode)
      .field('secret', SECRET)
      .attach('photos', photo, { filename: 'a.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
  });
});

describe('Antrean Penindak', () => {
  it('memfilter status, penanggung jawab, dan terlambat, serta menyertakan allowedActions', async () => {
    const ctx = await setup();
    const past = new Date(Date.now() - DAY);
    await insertReport(ctx, { title: 'Baru biasa' });
    await insertReport(ctx, {
      title: 'Bahaya terlambat',
      severity: 'DANGEROUS',
      dueAt: past,
    });
    await insertReport(ctx, {
      title: 'Bahaya sudah menunggu konfirmasi',
      severity: 'DANGEROUS',
      dueAt: past,
      status: 'AWAITING_CONFIRMATION',
    });
    await insertReport(ctx, {
      title: 'Diproses Rina',
      status: 'IN_PROGRESS',
      assigneeId: ctx.handler.user.id,
    });
    await insertReport(ctx, { title: 'Tersembunyi', isHidden: true });
    const base = `/api/boards/${ctx.board.slug}/queue`;

    const all = await ctx.handler.agent.get(base);
    const overdue = await ctx.handler.agent.get(`${base}?overdue=true`);
    const notOverdue = await ctx.handler.agent.get(`${base}?overdue=false`);
    const mine = await ctx.handler.agent.get(`${base}?assigneeId=${ctx.handler.user.id}`);
    const waiting = await ctx.handler.agent.get(`${base}?status=AWAITING_CONFIRMATION`);

    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBe(4);
    expect(overdue.body.data.map((item) => item.title)).toEqual(['Bahaya terlambat']);
    expect(overdue.body.data[0]).toMatchObject({ isOverdue: true });
    expect(notOverdue.body.meta.total).toBe(3);
    expect(mine.body.data).toEqual([
      expect.objectContaining({
        title: 'Diproses Rina',
        assignee: expect.objectContaining({ name: 'Bu Rina' }),
        allowedActions: ['RESOLVE', 'REJECT', 'DUPLICATE'],
      }),
    ]);
    expect(waiting.body.data[0]).toMatchObject({ isOverdue: false, allowedActions: [] });
  });

  it('hanya untuk Penindak Board itu', async () => {
    const ctx = await setup();
    const base = `/api/boards/${ctx.board.slug}/queue`;

    expect((await ctx.stranger.agent.get(base)).status).toBe(403);
    expect((await request(app).get(base)).status).toBe(401);
    expect((await ctx.owner.agent.get(`${base}?overdue=mungkin`)).status).toBe(400);
  });
});

describe('Job terjadwal', () => {
  async function awaitingSince(ctx, daysAgo) {
    const report = await insertReport(ctx, { status: 'AWAITING_CONFIRMATION' });
    await prisma.reportEvent.create({
      data: {
        reportId: report.id,
        fromStatus: 'IN_PROGRESS',
        toStatus: 'AWAITING_CONFIRMATION',
        actorType: 'HANDLER',
        createdAt: new Date(Date.now() - daysAgo * DAY),
      },
    });
    return report;
  }

  it('Menunggu Konfirmasi lebih dari 3 hari menjadi Selesai otomatis', async () => {
    const ctx = await setup();
    const old = await awaitingSince(ctx, 4);
    const fresh = await awaitingSince(ctx, 2);

    expect(await autoConfirmReports(new Date(), 3)).toBe(1);

    const oldDetail = await request(app).get(`/api/reports/${old.id}`);
    expect(oldDetail.body.data.status).toBe('RESOLVED');
    expect(oldDetail.body.data.timeline.at(-1)).toMatchObject({
      actorType: 'SYSTEM',
      actor: null,
      note: 'Dikonfirmasi otomatis',
    });
    expect((await prisma.report.findUnique({ where: { id: fresh.id } })).status).toBe(
      'AWAITING_CONFIRMATION',
    );
    expect(await autoConfirmReports(new Date(), 3)).toBe(0);
  });

  it('Board tanpa aktivitas 30 hari menjadi Tidak Aktif dan aktif lagi saat Penindak bertindak', async () => {
    const ctx = await setup();
    await prisma.board.update({
      where: { id: ctx.board.id },
      data: { lastHandlerActivityAt: new Date(Date.now() - 31 * DAY) },
    });
    const report = await insertReport(ctx);

    expect(await markInactiveBoards(new Date())).toBe(1);
    const inactive = await request(app).get(`/api/boards/${ctx.board.slug}`);
    expect(inactive.body.data).toMatchObject({
      status: 'INACTIVE',
      isInactive: true,
      trustLabel: 'INACTIVE',
    });

    await ctx.owner.agent.post(path(report, 'process')).send({}).expect(200);
    const active = await request(app).get(`/api/boards/${ctx.board.slug}`);
    expect(active.body.data.status).toBe('ACTIVE');
  });

  it('runScheduledJobs menjalankan job status dan peringatan batas waktu', async () => {
    const ctx = await setup();
    await awaitingSince(ctx, 5);

    expect(await runScheduledJobs(new Date())).toEqual({
      autoConfirmed: 1,
      inactiveBoards: 0,
      dueWarnings: 0,
      unfrozenBoards: 0,
    });
  });
});
