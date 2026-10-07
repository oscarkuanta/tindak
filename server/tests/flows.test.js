import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { uploadDir } from '../src/lib/storage.js';
import { scoreImage } from '../src/lib/nsfw.js';
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

async function createBoard(owner) {
  const res = await owner.agent
    .post('/api/boards')
    .send({
      name: 'Jalan Ahmad Yani',
      city: 'Kota Surabaya',
      type: 'ROAD',
      description: 'Kanal laporan kerusakan sepanjang Jalan Ahmad Yani.',
    })
    .expect(201);
  return res.body.data;
}

function guestReport(agent, board, severity = 'DANGEROUS') {
  return agent
    .post(`/api/boards/${board.slug}/reports`)
    .field('title', 'Lubang besar di lajur kiri')
    .field('categoryId', String(board.categories[0].id))
    .field('severity', severity)
    .field('locationDetail', 'Depan Royal Plaza')
    .field('description', 'Lubang selebar satu meter, sudah ada pengendara jatuh.')
    .field('turnstileToken', 'XXXX.DUMMY.TOKEN.XXXX')
    .attach('photos', photo, { filename: 'a.jpg', contentType: 'image/jpeg' });
}

describe('Alur kritis', () => {
  it('tamu melapor, Penindak menangani, tamu mengonfirmasi lewat Kode Lacak', async () => {
    const owner = await loginAs('owner@example.com');
    const board = await createBoard(owner);
    const guest = request.agent(app);

    const created = await guestReport(guest, board).expect(201);
    const { report, trackingCode, trackingUrl } = created.body.data;
    const trackingSecret = new URL(trackingUrl, 'http://localhost').searchParams.get('secret');
    const queue = await owner.agent.get(`/api/boards/${board.slug}/queue`);
    await owner.agent.post(`/api/reports/${report.id}/process`).send({}).expect(200);
    await owner.agent
      .post(`/api/reports/${report.id}/resolve`)
      .field('note', 'Sudah ditambal')
      .attach('photos', photo, { filename: 'b.jpg', contentType: 'image/jpeg' })
      .expect(200);
    const tracked = await request(app).get(
      `/api/track/${trackingCode}?secret=${encodeURIComponent(trackingSecret)}`,
    );
    const confirmed = await request(app)
      .post(`/api/reports/${report.id}/confirm`)
      .field('result', 'resolved')
      .field('trackingCode', trackingCode)
      .field('secret', trackingSecret);

    expect(queue.body.data.map((item) => item.id)).toContain(report.id);
    expect(tracked.body.data.status).toBe('AWAITING_CONFIRMATION');
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('RESOLVED');
    expect(confirmed.body.data.timeline.map((entry) => entry.toStatus)).toEqual([
      'NEW',
      'IN_PROGRESS',
      'AWAITING_CONFIRMATION',
      'RESOLVED',
    ]);
    expect(
      await prisma.notification.count({
        where: { userId: owner.user.id, type: 'HANDLER_DANGEROUS_REPORT' },
      }),
    ).toBe(1);
    const stats = await owner.agent.get(`/api/boards/${board.slug}/stats`);
    expect(stats.body.data.dangerous).toMatchObject({ total: 1, onTime: 1 });
  });

  it('warga memberi rating, Board masuk antrean, Admin Board menjadikan Official', async () => {
    const owner = await loginAs('owner@example.com');
    const board = await createBoard(owner);
    const verifier = await loginAs('boardadmin@tindak.test', { role: 'BOARD_ADMIN' });
    await prisma.board.update({
      where: { id: board.id },
      data: { createdAt: new Date(Date.now() - 40 * DAY) },
    });
    for (let index = 0; index < 20; index += 1) {
      const fan = await loginAs(`fan${index}@example.com`);
      await fan.agent.post(`/api/boards/${board.slug}/follow`).expect(200);
      await fan.agent.put(`/api/boards/${board.slug}/rating`).send({ stars: 5 }).expect(200);
    }

    const candidates = await verifier.agent.get('/api/board-admin/candidates');
    const detail = await verifier.agent.get(`/api/board-admin/boards/${board.slug}`);
    await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/verify`)
      .send({ note: 'Pengelola resmi jalan' })
      .expect(200);
    const publicBoard = await request(app).get(`/api/boards/${board.slug}`);

    expect(candidates.body.data.map((item) => item.slug)).toEqual([board.slug]);
    expect(detail.body.data.isCandidateEligible).toBe(true);
    expect(publicBoard.body.data).toMatchObject({
      verification: 'OFFICIAL',
      trustLabel: 'TRUSTED',
      ratingCount: 20,
    });
    expect(
      await prisma.notification.count({ where: { userId: owner.user.id, type: 'BOARD_VERIFIED' } }),
    ).toBe(1);
  });

  it('laporan spam disembunyikan warga, Admin hapus + ban, pengirim tidak bisa lapor lagi', async () => {
    const owner = await loginAs('owner@example.com');
    const board = await createBoard(owner);
    const admin = await loginAs('admin@tindak.test', { role: 'ADMIN' });
    const spammer = request.agent(app);
    const created = await guestReport(spammer, board, 'LOW').expect(201);
    const reportId = created.body.data.report.id;
    for (let index = 0; index < 3; index += 1) {
      const user = await loginAs(`warga${index}@example.com`);
      await user.agent
        .post('/api/flags')
        .send({ targetType: 'REPORT', targetId: reportId, reason: 'SPAM' })
        .expect(201);
    }

    const publicView = await request(app).get(`/api/reports/${reportId}`);
    const queue = await admin.agent.get('/api/admin/moderation');
    await admin.agent
      .post(`/api/admin/reports/${reportId}/remove`)
      .send({ ban: { targetType: 'GUEST_TOKEN', duration: '7d', reason: 'Spam promosi' } })
      .expect(200);
    await prisma.report.updateMany({ data: { createdAt: new Date(Date.now() - 2 * DAY) } });
    const again = await guestReport(spammer, board, 'LOW');

    expect(publicView.body.data).toMatchObject({ isHidden: true });
    expect(publicView.body.data.title).toBeUndefined();
    expect(queue.body.data[0]).toMatchObject({ targetId: reportId, flagCount: 3 });
    expect((await request(app).get(`/api/reports/${reportId}`)).status).toBe(404);
    expect(again.status).toBe(403);
    expect(again.body.error.code).toBe('ACCOUNT_BANNED');
  });
});
