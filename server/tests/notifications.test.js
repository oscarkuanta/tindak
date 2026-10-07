import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { uploadDir } from '../src/lib/storage.js';
import { scoreImage } from '../src/lib/nsfw.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { recomputeBoardTrust } from '../src/modules/trust/trust.service.js';
import { notifyDueSoon, sendRatingDigest } from '../src/modules/notifications/notify.service.js';
import { createUser, resetDatabase } from './helpers/db.js';
import { jpegWithExif } from './helpers/images.js';

vi.mock('../src/lib/nsfw.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, scoreImage: vi.fn(async () => null) };
});

const DAY = 24 * 60 * 60 * 1000;
let app;
let photo;

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(scoreImage).mockResolvedValue(null);
  app = createApp();
  photo ??= await jpegWithExif({ width: 300, height: 200 });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
  await rm(uploadDir, { recursive: true, force: true });
});

async function loginAs(email, overrides = {}) {
  const user = await createUser({ email, name: email.split('@')[0], ...overrides });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'rahasia123' }).expect(200);
  return { user, agent };
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
  return { owner, handler, board };
}

function sendReport(agent, board, severity = 'MEDIUM') {
  return agent
    .post(`/api/boards/${board.slug}/reports`)
    .field('title', 'Lubang besar')
    .field('categoryId', String(board.categories[0].id))
    .field('severity', severity)
    .field('locationDetail', 'Depan Indomaret')
    .field('description', 'Lubang selebar satu meter di tengah jalan raya.')
    .field('turnstileToken', 'XXXX.DUMMY.TOKEN.XXXX')
    .attach('photos', photo, { filename: 'a.jpg', contentType: 'image/jpeg' });
}

async function insertReport(board, overrides = {}) {
  return prisma.report.create({
    data: {
      boardId: board.id,
      categoryId: board.categories[0].id,
      title: 'Laporan uji',
      description: 'Deskripsi laporan uji yang cukup panjang.',
      locationDetail: 'Lokasi uji',
      severity: 'LOW',
      trackingCode: generateTrackingCode(),
      trackingSecretHash: sha256('x'),
      ...overrides,
    },
  });
}

async function typesFor(userId) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { id: 'asc' },
    select: { type: true },
  });
  return rows.map((row) => row.type);
}

async function follow(userId, boardId, notifyLevel) {
  await prisma.boardFollower.create({ data: { boardId, userId, notifyLevel } });
}

describe('Laporan baru', () => {
  it('Penindak dan pengikut mendapat notifikasi sesuai notifyLevel, pelapor tidak', async () => {
    const { owner, handler, board } = await setup();
    const all = await createUser({ email: 'all@example.com' });
    const dangerousOnly = await createUser({ email: 'danger@example.com' });
    const off = await createUser({ email: 'off@example.com' });
    const reporter = await loginAs('reporter@example.com');
    await follow(all.id, board.id, 'ALL');
    await follow(dangerousOnly.id, board.id, 'DANGEROUS_ONLY');
    await follow(off.id, board.id, 'OFF');
    await follow(reporter.user.id, board.id, 'ALL');
    await follow(handler.user.id, board.id, 'ALL');

    await sendReport(reporter.agent, board, 'MEDIUM').expect(201);

    expect(await typesFor(owner.user.id)).toEqual(['HANDLER_NEW_REPORT']);
    expect(await typesFor(handler.user.id)).toEqual(['HANDLER_NEW_REPORT']);
    expect(await typesFor(all.id)).toEqual(['BOARD_NEW_REPORT']);
    expect(await typesFor(dangerousOnly.id)).toEqual([]);
    expect(await typesFor(off.id)).toEqual([]);
    expect(await typesFor(reporter.user.id)).toEqual([]);
  });

  it('laporan Berbahaya dari tamu memakai jenis khusus dan sampai ke pengikut hanya Berbahaya', async () => {
    const { owner, board } = await setup();
    const dangerousOnly = await createUser({ email: 'danger@example.com' });
    await follow(dangerousOnly.id, board.id, 'DANGEROUS_ONLY');

    await sendReport(request.agent(app), board, 'DANGEROUS').expect(201);

    expect(await typesFor(owner.user.id)).toEqual(['HANDLER_DANGEROUS_REPORT']);
    expect(await typesFor(dangerousOnly.id)).toEqual(['BOARD_NEW_REPORT']);
    const [row] = await prisma.notification.findMany({ where: { userId: owner.user.id } });
    expect(row.data).toMatchObject({
      reportTitle: 'Lubang besar',
      boardSlug: board.slug,
      severity: 'DANGEROUS',
    });
  });
});

describe('Perubahan status', () => {
  it('pelapor mendapat notifikasi, Penindak pelaku tidak', async () => {
    const { owner, handler, board } = await setup();
    const reporter = await createUser({ email: 'reporter@example.com' });
    const report = await insertReport(board, { userId: reporter.id });

    await owner.agent.post(`/api/reports/${report.id}/process`).send({}).expect(200);
    await owner.agent
      .post(`/api/reports/${report.id}/reject`)
      .send({ reason: 'OUT_OF_SCOPE', note: 'Bukan wewenang' })
      .expect(200);

    expect(await typesFor(reporter.id)).toEqual(['REPORT_STATUS_CHANGED', 'REPORT_STATUS_CHANGED']);
    expect(await typesFor(owner.user.id)).toEqual([]);
    expect(await typesFor(handler.user.id)).toEqual([]);
    const last = await prisma.notification.findFirst({
      where: { userId: reporter.id },
      orderBy: { id: 'desc' },
    });
    expect(last.data).toMatchObject({ status: 'REJECTED', statusLabel: 'Ditolak' });
  });

  it('minta info ke pelapor, jawaban ke Penindak', async () => {
    const { owner, handler, board } = await setup();
    const reporter = await loginAs('reporter@example.com');
    const report = await insertReport(board, { userId: reporter.user.id });

    await owner.agent
      .post(`/api/reports/${report.id}/request-info`)
      .send({ question: 'Di depan nomor berapa?' })
      .expect(200);
    await reporter.agent
      .post(`/api/reports/${report.id}/answer-info`)
      .send({ answer: 'Nomor 12' })
      .expect(200);

    expect(await typesFor(reporter.user.id)).toEqual(['REPORT_INFO_REQUESTED']);
    expect(await typesFor(owner.user.id)).toEqual(['HANDLER_INFO_ANSWERED']);
    expect(await typesFor(handler.user.id)).toEqual(['HANDLER_INFO_ANSWERED']);
    const info = await prisma.notification.findFirst({ where: { userId: reporter.user.id } });
    expect(info.data.question).toBe('Di depan nomor berapa?');
  });

  it('duplikat dan dibuka ulang', async () => {
    const { owner, handler, board } = await setup();
    const reporter = await loginAs('reporter@example.com');
    const parent = await insertReport(board);
    const report = await insertReport(board, { userId: reporter.user.id });
    const reopened = await insertReport(board, {
      userId: reporter.user.id,
      status: 'AWAITING_CONFIRMATION',
    });

    await owner.agent
      .post(`/api/reports/${report.id}/duplicate`)
      .send({ parentId: parent.id })
      .expect(200);
    await reporter.agent
      .post(`/api/reports/${reopened.id}/confirm`)
      .field('result', 'not_resolved')
      .field('note', 'Masih berlubang')
      .expect(200);

    expect(await typesFor(reporter.user.id)).toEqual(['REPORT_MARKED_DUPLICATE']);
    expect(await typesFor(handler.user.id)).toEqual(['HANDLER_REPORT_REOPENED']);
  });

  it('pendukung mendapat notifikasi saat laporan selesai', async () => {
    const { board } = await setup();
    const reporter = await loginAs('reporter@example.com');
    const supporter = await createUser({ email: 'supporter@example.com' });
    const report = await insertReport(board, {
      userId: reporter.user.id,
      status: 'AWAITING_CONFIRMATION',
    });
    await prisma.support.create({ data: { reportId: report.id, userId: supporter.id } });
    await prisma.support.create({ data: { reportId: report.id, userId: reporter.user.id } });

    await reporter.agent
      .post(`/api/reports/${report.id}/confirm`)
      .field('result', 'resolved')
      .expect(200);

    expect(await typesFor(supporter.id)).toEqual(['SUPPORTED_REPORT_RESOLVED']);
    expect(await typesFor(reporter.user.id)).toEqual([]);
  });

  it('peringatan batas waktu Berbahaya hanya sekali', async () => {
    const { owner, handler, board } = await setup();
    const now = new Date();
    await insertReport(board, {
      severity: 'DANGEROUS',
      dueAt: new Date(now.getTime() + 5 * 60 * 60 * 1000),
    });
    await insertReport(board, {
      severity: 'DANGEROUS',
      dueAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
    });

    expect(await notifyDueSoon(now, 6)).toBe(1);
    expect(await notifyDueSoon(now, 6)).toBe(0);
    expect(await typesFor(owner.user.id)).toEqual(['HANDLER_DEADLINE_SOON']);
    expect(await typesFor(handler.user.id)).toEqual(['HANDLER_DEADLINE_SOON']);
  });
});

describe('Dukungan dan moderasi', () => {
  it('milestone dukungan dikirim sekali', async () => {
    const { board } = await setup();
    const reporter = await createUser({ email: 'reporter@example.com' });
    const report = await insertReport(board, { userId: reporter.id });
    for (let index = 0; index < 8; index += 1) {
      const supporter = await createUser({ email: `supporter${index}@example.com` });
      await prisma.support.create({ data: { reportId: report.id, userId: supporter.id } });
    }
    const fan = await loginAs('fan@example.com');

    await fan.agent.put(`/api/reports/${report.id}/support`).expect(200);
    await fan.agent.delete(`/api/reports/${report.id}/support`).expect(200);
    await fan.agent.put(`/api/reports/${report.id}/support`).expect(200);

    expect(await typesFor(reporter.id)).toEqual(['REPORT_SUPPORT_MILESTONE']);
    const row = await prisma.notification.findFirst({ where: { userId: reporter.id } });
    expect(row.data.milestone).toBe(10);
  });

  it('pelapor diberi tahu saat laporan disembunyikan atau dihapus', async () => {
    const { owner, board } = await setup();
    const admin = await loginAs('admin@tindak.test', { role: 'ADMIN' });
    const reporter = await createUser({ email: 'reporter@example.com' });
    const hidden = await insertReport(board, { userId: reporter.id });
    const removed = await insertReport(board, { userId: reporter.id });

    await owner.agent
      .post('/api/flags')
      .send({ targetType: 'REPORT', targetId: hidden.id, reason: 'SPAM' })
      .expect(201);
    await admin.agent.post(`/api/admin/reports/${removed.id}/remove`).send({}).expect(200);

    expect(await typesFor(reporter.id)).toEqual(['REPORT_HIDDEN', 'REPORT_REMOVED']);
  });
});

describe('Board dan verifikasi', () => {
  it('undangan Penindak sampai ke yang diundang', async () => {
    const { owner, board } = await setup();
    const invitee = await createUser({ email: 'calon@example.com' });

    await owner.agent
      .post(`/api/boards/${board.slug}/handlers`)
      .send({ email: 'calon@example.com' })
      .expect(201);

    expect(await typesFor(invitee.id)).toEqual(['BOARD_INVITATION']);
    expect(await typesFor(owner.user.id)).toEqual([]);
  });

  it('Official diberikan dan dicabut ke Penindak Utama, kandidat baru ke semua Admin Board', async () => {
    const { owner, board } = await setup();
    const verifier = await loginAs('boardadmin@tindak.test', { role: 'BOARD_ADMIN' });
    const otherVerifier = await createUser({ email: 'verifier2@example.com', role: 'BOARD_ADMIN' });
    await prisma.board.update({
      where: { id: board.id },
      data: { createdAt: new Date(Date.now() - 40 * DAY) },
    });
    for (let index = 0; index < 20; index += 1) {
      const rater = await createUser({ email: `rater${index}@example.com` });
      await prisma.boardRating.create({ data: { boardId: board.id, userId: rater.id, stars: 5 } });
    }
    await recomputeBoardTrust(board.id);

    await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/verify`)
      .send({ note: 'Pengelola resmi' })
      .expect(200);
    await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/revoke`)
      .send({ reason: 'Pengelola tidak lagi resmi' })
      .expect(200);

    expect(await typesFor(verifier.user.id)).toEqual([
      'BOARD_CANDIDATE_NEW',
      'BOARD_CANDIDATE_NEW',
    ]);
    expect(await typesFor(otherVerifier.id)).toEqual([
      'BOARD_CANDIDATE_NEW',
      'BOARD_CANDIDATE_NEW',
    ]);
    expect(await typesFor(owner.user.id)).toEqual(['BOARD_VERIFIED', 'BOARD_VERIFICATION_REVOKED']);
    const revoked = await prisma.notification.findFirst({
      where: { type: 'BOARD_VERIFICATION_REVOKED' },
    });
    expect(revoked.data).toMatchObject({
      boardSlug: board.slug,
      reason: 'Pengelola tidak lagi resmi',
    });
  });

  it('Board Official yang skornya turun masuk Perlu Ditinjau Ulang', async () => {
    const { board } = await setup();
    const verifier = await createUser({ email: 'boardadmin@tindak.test', role: 'BOARD_ADMIN' });
    await prisma.board.update({ where: { id: board.id }, data: { verification: 'OFFICIAL' } });
    for (let index = 0; index < 10; index += 1) {
      const rater = await createUser({ email: `rater${index}@example.com` });
      await prisma.boardRating.create({ data: { boardId: board.id, userId: rater.id, stars: 1 } });
    }

    await recomputeBoardTrust(board.id);
    await recomputeBoardTrust(board.id);

    expect(await typesFor(verifier.id)).toEqual(['BOARD_NEEDS_REVIEW']);
  });

  it('ringkasan rating harian ke Penindak', async () => {
    const { owner, handler, board } = await setup();
    const rater = await createUser({ email: 'rater@example.com' });
    await prisma.boardRating.create({ data: { boardId: board.id, userId: rater.id, stars: 4 } });
    await recomputeBoardTrust(board.id);

    expect(await sendRatingDigest()).toBe(1);
    expect(await typesFor(owner.user.id)).toEqual(['BOARD_RATING_DIGEST']);
    expect(await typesFor(handler.user.id)).toEqual(['BOARD_RATING_DIGEST']);
    const row = await prisma.notification.findFirst({ where: { userId: owner.user.id } });
    expect(row.data).toMatchObject({ newRatings: 1, ratingCount: 1 });
  });
});

describe('Endpoint notifikasi', () => {
  it('daftar, jumlah belum dibaca, tandai dibaca, dan tandai semua', async () => {
    const reader = await loginAs('reader@example.com');
    const other = await loginAs('other@example.com');
    const rows = [];
    for (const title of ['A', 'B', 'C']) {
      rows.push(
        await prisma.notification.create({
          data: { userId: reader.user.id, type: 'BOARD_NEW_REPORT', data: { reportTitle: title } },
        }),
      );
    }
    const foreign = await prisma.notification.create({
      data: { userId: other.user.id, type: 'BOARD_NEW_REPORT', data: {} },
    });

    expect((await request(app).get('/api/notifications')).status).toBe(401);
    const list = await reader.agent.get('/api/notifications?pageSize=2');
    expect(list.body.data.map((item) => item.data.reportTitle)).toEqual(['C', 'B']);
    expect(list.body.meta).toMatchObject({ total: 3, totalPages: 2 });
    expect((await reader.agent.get('/api/notifications/unread-count')).body.data).toEqual({
      count: 3,
    });

    const read = await reader.agent.post(`/api/notifications/${rows[0].id}/read`);
    expect(read.body.data).toMatchObject({ id: rows[0].id, isRead: true });
    expect((await reader.agent.post(`/api/notifications/${foreign.id}/read`)).status).toBe(404);
    expect((await reader.agent.get('/api/notifications?unread=true')).body.meta.total).toBe(2);

    const all = await reader.agent.post('/api/notifications/read-all');
    expect(all.body.data).toEqual({ updated: 2 });
    expect((await reader.agent.get('/api/notifications/unread-count')).body.data.count).toBe(0);
    expect((await other.agent.get('/api/notifications/unread-count')).body.data.count).toBe(1);
  });
});
