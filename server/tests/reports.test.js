import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { uploadDir } from '../src/lib/storage.js';
import { scoreImage } from '../src/lib/nsfw.js';
import { verifyTurnstile } from '../src/lib/turnstile.js';
import { AppError } from '../src/utils/AppError.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { createUser, resetDatabase } from './helpers/db.js';
import { jpegWithExif, smallPng } from './helpers/images.js';

vi.mock('../src/lib/nsfw.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, scoreImage: vi.fn(async () => null) };
});

vi.mock('../src/lib/turnstile.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, verifyTurnstile: vi.fn(actual.verifyTurnstile) };
});

let app;
let jpeg;
let png;

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(scoreImage).mockReset().mockResolvedValue(null);
  app = createApp();
  jpeg ??= await jpegWithExif();
  png ??= await smallPng();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
  await rm(uploadDir, { recursive: true, force: true });
});

async function loginAs(email, overrides = {}) {
  const user = await createUser({ email, name: overrides.name ?? 'Budi Santoso', ...overrides });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'rahasia123' }).expect(200);
  return { user, agent };
}

async function createBoard(overrides = {}) {
  const owner = await loginAs(`owner${Math.random().toString(36).slice(2, 7)}@example.com`, {
    name: 'Pemilik Board',
  });
  const res = await owner.agent
    .post('/api/boards')
    .send({
      name: 'Jalan Rungkut Madya',
      city: 'Kota Surabaya',
      type: 'ROAD',
      description: 'Melayani laporan kerusakan sepanjang Jalan Rungkut Madya.',
      dangerousTargetHours: 24,
      ...overrides,
    })
    .expect(201);
  return { owner, board: res.body.data, categoryId: res.body.data.categories[0].id };
}

function sendReport(agent, slug, fields = {}, photos = [{ buffer: jpeg, name: 'foto.jpg' }]) {
  let req = agent.post(`/api/boards/${slug}/reports`);
  const values = {
    title: 'Lubang besar di tengah jalan',
    severity: 'DANGEROUS',
    locationDetail: 'Depan Indomaret Rungkut Madya',
    description: 'Lubang selebar satu meter, sudah dua motor jatuh minggu ini.',
    isAnonymous: 'false',
    turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
    ...fields,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) req = req.field(key, String(value));
  }
  for (const photo of photos) {
    req = req.attach('photos', photo.buffer, {
      filename: photo.name,
      contentType: photo.type ?? 'image/jpeg',
    });
  }
  return req;
}

async function backdateReports(minutes) {
  await prisma.report.updateMany({ data: { createdAt: new Date(Date.now() - minutes * 60_000) } });
}

async function cloneReport(source, count, overrides = {}) {
  const data = { ...source };
  delete data.id;
  delete data.trackingCode;
  for (let index = 0; index < count; index += 1) {
    await prisma.report.create({
      data: {
        ...data,
        trackingCode: generateTrackingCode(),
        createdAt: new Date(Date.now() - 30 * 60_000),
        ...overrides,
      },
    });
  }
}

function guestCookie(res) {
  return (res.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith('tindak.gt='));
}

describe('POST /api/boards/:slug/reports', () => {
  it('tamu berhasil melapor: anonim, cookie token, Kode Lacak, dan timeline awal', async () => {
    const { board, categoryId } = await createBoard();
    const guest = request.agent(app);

    const res = await sendReport(guest, board.slug, { categoryId, isAnonymous: 'false' });

    expect(res.status).toBe(201);
    const cookie = guestCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const { report, trackingCode, trackingUrl } = res.body.data;
    expect(trackingCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(trackingUrl).toMatch(new RegExp(`/lacak/${trackingCode}\\?secret=[A-Za-z0-9_-]+$`));
    expect(report).toMatchObject({
      isAnonymous: true,
      reporter: null,
      status: 'NEW',
      severity: 'DANGEROUS',
      category: { id: categoryId },
      board: { slug: board.slug },
      allowedActions: [],
    });
    expect(report).not.toHaveProperty('reporterType');
    expect(report.timeline).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'NEW', note: 'Laporan dibuat' }),
    ]);
    expect(report.media).toHaveLength(1);
    expect(report.media[0].url).toMatch(/^\/api\/uploads\/.+\.webp$/);

    const stored = await prisma.report.findUnique({ where: { id: report.id } });
    const secret = new URL(trackingUrl).searchParams.get('secret');
    expect(stored.userId).toBeNull();
    expect(stored.guestTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.trackingSecretHash).not.toContain(secret);
    expect(stored.dueAt.getTime() - stored.createdAt.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('menghapus EXIF, mengubah ke WebP, dan memperkecil ke maks 1600 px', async () => {
    const original = await sharp(jpeg).metadata();
    expect(original.exif).toBeDefined();
    const { board, categoryId } = await createBoard();

    const res = await sendReport(request.agent(app), board.slug, { categoryId });

    const media = await prisma.reportMedia.findFirst({
      where: { reportId: res.body.data.report.id },
    });
    const file = path.join(uploadDir, media.storageKey);
    const meta = await sharp(file).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
    expect(Math.max(meta.width, meta.height)).toBe(1600);

    const served = await request(app).get(media.url);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/webp');
  });

  it('menerima beberapa foto PNG dan WebP', async () => {
    const { board, categoryId } = await createBoard();
    const webp = await sharp(png).webp().toBuffer();

    const res = await sendReport(request.agent(app), board.slug, { categoryId, severity: 'LOW' }, [
      { buffer: png, name: 'a.png', type: 'image/png' },
      { buffer: webp, name: 'b.webp', type: 'image/webp' },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.data.report.media).toHaveLength(2);
    expect(res.body.data.report.dueAt).toBeNull();
  });

  it('user login bisa memilih anonim atau tidak', async () => {
    const { board, categoryId } = await createBoard();
    const budi = await loginAs('budi@example.com');

    const named = await sendReport(budi.agent, board.slug, { categoryId });
    await backdateReports(5);
    const anonymous = await sendReport(budi.agent, board.slug, { categoryId, isAnonymous: 'true' });

    expect(named.body.data.report.reporter).toMatchObject({ name: 'Budi Santoso' });
    expect(anonymous.body.data.report.reporter).toBeNull();
    expect(anonymous.body.data.report.isAnonymous).toBe(true);
    const stored = await prisma.report.findUnique({
      where: { id: anonymous.body.data.report.id },
    });
    expect(stored.userId).toBe(budi.user.id);
    expect(stored.guestTokenHash).toBeNull();
  });

  it('menolak file yang bukan gambar walau mengaku JPEG', async () => {
    const { board, categoryId } = await createBoard();

    const res = await sendReport(request.agent(app), board.slug, { categoryId }, [
      { buffer: Buffer.from('ini bukan gambar sama sekali'), name: 'palsu.jpg' },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { field: 'photos', message: 'File harus berupa foto JPEG, PNG, atau WebP' },
    ]);
    expect(await prisma.report.count()).toBe(0);
  });

  it('menolak tanpa foto, lebih dari 4 foto, dan foto di atas 5 MB', async () => {
    const { board, categoryId } = await createBoard();
    const guest = request.agent(app);
    const big = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]);

    const none = await sendReport(guest, board.slug, { categoryId }, []);
    const five = await sendReport(
      guest,
      board.slug,
      { categoryId },
      Array.from({ length: 5 }, (_, index) => ({
        buffer: png,
        name: `${index}.png`,
        type: 'image/png',
      })),
    );
    const tooBig = await sendReport(guest, board.slug, { categoryId }, [
      { buffer: big, name: 'besar.png', type: 'image/png' },
    ]);

    expect(none.status).toBe(400);
    expect(none.body.error.details[0]).toEqual({
      field: 'photos',
      message: 'Unggah minimal 1 foto',
    });
    expect(five.status).toBe(400);
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.error.details[0].message).toBe('Ukuran setiap foto maksimal 5 MB');
  });

  it('menolak data tidak valid dan field asing', async () => {
    const { board, categoryId } = await createBoard();
    const guest = request.agent(app);

    const invalid = await sendReport(guest, board.slug, {
      categoryId,
      title: '',
      severity: 'PARAH',
      description: 'pendek',
    });
    const extra = await sendReport(guest, board.slug, { categoryId, status: 'RESOLVED' });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details.map((detail) => detail.field)).toEqual(
      expect.arrayContaining(['title', 'severity', 'description']),
    );
    expect(extra.status).toBe(400);
    expect(extra.body.error.details).toContainEqual({
      field: 'status',
      message: 'Field ini tidak boleh dikirim',
    });
  });

  it('menolak captcha yang gagal atau kosong', async () => {
    const { board, categoryId } = await createBoard();
    vi.mocked(verifyTurnstile).mockRejectedValueOnce(
      new AppError(400, 'VALIDATION_ERROR', 'Verifikasi captcha gagal', [
        { field: 'turnstileToken', message: 'Verifikasi captcha gagal, silakan ulangi' },
      ]),
    );

    const failed = await sendReport(request.agent(app), board.slug, { categoryId });
    const empty = await sendReport(request.agent(app), board.slug, {
      categoryId,
      turnstileToken: '',
    });

    expect(failed.status).toBe(400);
    expect(failed.body.error.details[0].field).toBe('turnstileToken');
    expect(empty.status).toBe(400);
    expect(await prisma.report.count()).toBe(0);
  });

  it('menolak kategori milik Board lain dan Board beku', async () => {
    const first = await createBoard();
    const second = await createBoard({ name: 'Board Kedua' });
    await prisma.board.update({ where: { id: second.board.id }, data: { status: 'FROZEN' } });

    const wrongCategory = await sendReport(request.agent(app), first.board.slug, {
      categoryId: second.categoryId,
    });
    const frozen = await sendReport(request.agent(app), second.board.slug, {
      categoryId: second.categoryId,
    });

    expect(wrongCategory.status).toBe(404);
    expect(wrongCategory.body.error.code).toBe('CATEGORY_NOT_FOUND');
    expect(frozen.status).toBe(404);
    expect(frozen.body.error.code).toBe('BOARD_NOT_FOUND');
  });

  it('menolak foto NSFW skor tinggi dan memburamkan skor sedang', async () => {
    const { board, categoryId } = await createBoard();
    vi.mocked(scoreImage).mockResolvedValueOnce(0.9);
    const filesBefore = existsSync(uploadDir) ? (await readdir(uploadDir)).length : 0;

    const rejected = await sendReport(request.agent(app), board.slug, { categoryId });

    expect(rejected.status).toBe(422);
    expect(rejected.body.error.code).toBe('IMAGE_REJECTED');
    expect(await prisma.report.count()).toBe(0);
    const filesAfter = existsSync(uploadDir) ? (await readdir(uploadDir)).length : 0;
    expect(filesAfter).toBe(filesBefore);

    vi.mocked(scoreImage).mockResolvedValueOnce(0.5);
    const blurred = await sendReport(request.agent(app), board.slug, { categoryId });

    expect(blurred.status).toBe(201);
    expect(blurred.body.data.report.media[0].isBlurred).toBe(true);
    const stored = await prisma.report.findUnique({ where: { id: blurred.body.data.report.id } });
    expect(stored.needsModeration).toBe(true);
  });
});

describe('Batas laporan', () => {
  it('tamu harus menunggu 2 menit antar laporan', async () => {
    const { board, categoryId } = await createBoard();
    const guest = request.agent(app);

    await sendReport(guest, board.slug, { categoryId }).expect(201);
    const second = await sendReport(guest, board.slug, { categoryId });

    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe('RATE_LIMITED');
    expect(second.body.error.message).toMatch(/dalam 2 menit/);
  });

  it('tamu maksimal 3 laporan per hari per perangkat', async () => {
    const { board, categoryId } = await createBoard();
    const guest = request.agent(app);
    const first = await sendReport(guest, board.slug, { categoryId }).expect(201);
    const source = await prisma.report.findUnique({ where: { id: first.body.data.report.id } });
    await cloneReport(source, 2);
    await prisma.report.update({
      where: { id: source.id },
      data: { createdAt: new Date(Date.now() - 60 * 60_000) },
    });

    const blocked = await sendReport(guest, board.slug, { categoryId });
    const otherDevice = await sendReport(request.agent(app), board.slug, { categoryId });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toMatch(/perangkat ini/);
    expect(blocked.body.error.message).toMatch(/23 jam/);
    expect(otherDevice.status).toBe(201);
  });

  it('maksimal 30 laporan per hari dari satu jaringan', async () => {
    const { board, categoryId } = await createBoard();
    const first = await sendReport(request.agent(app), board.slug, { categoryId }).expect(201);
    const source = await prisma.report.findUnique({ where: { id: first.body.data.report.id } });
    await cloneReport(source, 29, { guestTokenHash: 'a'.repeat(64) });
    await backdateReports(30);

    const res = await sendReport(request.agent(app), board.slug, { categoryId });

    expect(res.status).toBe(429);
    expect(res.body.error.message).toMatch(/jaringan ini/);
  });

  it('user login maksimal 5 per hari dan jeda 1 menit', async () => {
    const { board, categoryId } = await createBoard();
    const budi = await loginAs('budi@example.com');
    const first = await sendReport(budi.agent, board.slug, { categoryId }).expect(201);

    const tooSoon = await sendReport(budi.agent, board.slug, { categoryId });
    expect(tooSoon.status).toBe(429);
    expect(tooSoon.body.error.message).toMatch(/1 menit/);

    const source = await prisma.report.findUnique({ where: { id: first.body.data.report.id } });
    await cloneReport(source, 4, { ipHash: 'b'.repeat(64) });
    await backdateReports(10);
    const blocked = await sendReport(budi.agent, board.slug, { categoryId });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toMatch(/akunmu/);
  });
});

describe('Membaca laporan', () => {
  async function seedReports() {
    const { owner, board, categoryId } = await createBoard();
    const budi = await loginAs('budi@example.com');
    const reports = [];
    for (const [title, severity] of [
      ['Lampu jalan mati', 'LOW'],
      ['Drainase tersumbat', 'MEDIUM'],
      ['Lubang dalam', 'DANGEROUS'],
    ]) {
      const res = await sendReport(budi.agent, board.slug, { categoryId, title, severity });
      reports.push(res.body.data);
      await backdateReports(2);
    }
    return { owner, board, categoryId, budi, reports };
  }

  it('daftar Board terbaru dulu, dengan filter, pencarian, dan pagination', async () => {
    const { board, reports } = await seedReports();
    await prisma.report.update({
      where: { id: reports[0].report.id },
      data: { createdAt: new Date('2026-01-01') },
    });

    const all = await request(app).get(`/api/boards/${board.slug}/reports?sort=hot`);
    const dangerous = await request(app).get(
      `/api/boards/${board.slug}/reports?severity=DANGEROUS`,
    );
    const search = await request(app).get(`/api/boards/${board.slug}/reports?q=drainase`);
    const paged = await request(app).get(`/api/boards/${board.slug}/reports?pageSize=2&page=2`);

    expect(all.status).toBe(200);
    expect(all.body.data.map((item) => item.title)).toEqual([
      'Lubang dalam',
      'Drainase tersumbat',
      'Lampu jalan mati',
    ]);
    expect(dangerous.body.data.map((item) => item.title)).toEqual(['Lubang dalam']);
    expect(search.body.data.map((item) => item.title)).toEqual(['Drainase tersumbat']);
    expect(paged.body.meta).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect(paged.body.data[0]).toMatchObject({
      title: 'Lampu jalan mati',
      category: { name: 'Jalan Berlubang' },
      reporter: { name: 'Budi Santoso' },
    });
  });

  it('laporan tersembunyi: publik melihat kartu ditinjau, Penindak dan pelapor melihat isi, yang dihapus 404', async () => {
    const { owner, board, budi, reports } = await seedReports();
    const hiddenId = reports[0].report.id;
    await prisma.report.update({ where: { id: hiddenId }, data: { isHidden: true } });
    const stranger = await loginAs('stranger@example.com');

    const list = await request(app).get(`/api/boards/${board.slug}/reports`);
    expect(list.body.meta.total).toBe(2);

    const asGuest = await request(app).get(`/api/reports/${hiddenId}`);
    const asStranger = await stranger.agent.get(`/api/reports/${hiddenId}`);
    expect(asGuest.status).toBe(200);
    expect(asGuest.body.data).toEqual({
      id: hiddenId,
      board: { slug: board.slug, name: board.name },
      isHidden: true,
      moderationNotice: 'Laporan ini sedang ditinjau moderator',
    });
    expect(asStranger.body.data).not.toHaveProperty('title');
    expect(asStranger.body.data).not.toHaveProperty('description');

    const asOwner = await owner.agent.get(`/api/reports/${hiddenId}`);
    const asReporter = await budi.agent.get(`/api/reports/${hiddenId}`);
    expect(asOwner.body.data).toMatchObject({ isHidden: true, title: expect.any(String) });
    expect(asReporter.body.data).toMatchObject({ isHidden: true, title: expect.any(String) });

    await prisma.report.update({ where: { id: hiddenId }, data: { removedAt: new Date() } });
    expect((await request(app).get(`/api/reports/${hiddenId}`)).status).toBe(404);
    expect((await budi.agent.get(`/api/reports/${hiddenId}`)).status).toBe(404);
    expect((await budi.agent.get('/api/me/reports')).body.meta.total).toBe(2);
  });

  it('reporterType hanya untuk Penindak Board itu', async () => {
    const { owner, budi, reports } = await seedReports();
    const id = reports[0].report.id;

    const asOwner = await owner.agent.get(`/api/reports/${id}`);
    const asReporter = await budi.agent.get(`/api/reports/${id}`);
    const asGuest = await request(app).get(`/api/reports/${id}`);

    expect(asOwner.body.data.reporterType).toBe('ACCOUNT');
    expect(asReporter.body.data).not.toHaveProperty('reporterType');
    expect(asGuest.body.data).not.toHaveProperty('reporterType');
    expect(asGuest.body.data).toMatchObject({
      timeline: [expect.objectContaining({ toStatus: 'NEW', actorType: 'REPORTER' })],
      infoRequest: null,
      parent: null,
      reopenCount: 0,
      reporterNotSatisfied: false,
    });
    expect((await request(app).get('/api/reports/999999')).body.error.code).toBe(
      'REPORT_NOT_FOUND',
    );
  });

  it('GET /me/reports hanya berisi laporan milik user', async () => {
    const { budi } = await seedReports();
    const other = await loginAs('other@example.com');

    const mine = await budi.agent.get('/api/me/reports');
    const theirs = await other.agent.get('/api/me/reports');

    expect(mine.body.meta.total).toBe(3);
    expect(theirs.body.data).toEqual([]);
    expect((await request(app).get('/api/me/reports')).status).toBe(401);
  });

  it('activeReportCount di detail dan pencarian Board', async () => {
    const { board, reports } = await seedReports();
    await prisma.report.update({
      where: { id: reports[0].report.id },
      data: { status: 'RESOLVED' },
    });
    await prisma.report.update({ where: { id: reports[1].report.id }, data: { isHidden: true } });

    const detail = await request(app).get(`/api/boards/${board.slug}`);
    const search = await request(app).get('/api/boards/search?q=rungkut');

    expect(detail.body.data.activeReportCount).toBe(1);
    expect(search.body.data[0].activeReportCount).toBe(1);
  });

  it('kategori yang sudah dipakai laporan tidak bisa dihapus', async () => {
    const { owner, board, categoryId } = await seedReports();

    const res = await owner.agent.delete(`/api/boards/${board.slug}/categories/${categoryId}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_IN_USE');
  });
});

describe('GET /api/track/:code', () => {
  it('membuka laporan dengan secret yang benar, termasuk format TND- huruf kecil', async () => {
    const { board, categoryId } = await createBoard();
    const created = await sendReport(request.agent(app), board.slug, { categoryId }).expect(201);
    const { trackingCode, trackingUrl } = created.body.data;
    const secret = new URL(trackingUrl).searchParams.get('secret');

    const res = await request(app).get(`/api/track/${trackingCode}?secret=${secret}`);
    const prefixed = await request(app).get(
      `/api/track/tnd-${trackingCode.toLowerCase()}?secret=${secret}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: created.body.data.report.id,
      status: 'NEW',
      timeline: [expect.objectContaining({ note: 'Laporan dibuat' })],
    });
    expect(prefixed.status).toBe(200);
  });

  it('secret salah dan kode tidak dikenal memberi 404 yang sama', async () => {
    const { board, categoryId } = await createBoard();
    const created = await sendReport(request.agent(app), board.slug, { categoryId }).expect(201);
    const { trackingCode } = created.body.data;

    const wrong = await request(app).get(`/api/track/${trackingCode}?secret=salah`);
    const unknown = await request(app).get('/api/track/ABCDEFGH?secret=salah');
    const missing = await request(app).get(`/api/track/${trackingCode}`);

    expect(wrong.status).toBe(404);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.code).toBe('REPORT_NOT_FOUND');
    expect(missing.status).toBe(400);
  });
});

describe('Laporan tamu pindah ke akun dan cari Laporan Saya', () => {
  async function guestReport(board, categoryId, title) {
    const created = await sendReport(request.agent(app), board.slug, { categoryId, title }).expect(
      201,
    );
    const { trackingCode, trackingUrl, report } = created.body.data;
    return { trackingCode, secret: new URL(trackingUrl).searchParams.get('secret'), id: report.id };
  }

  it('memindahkan laporan tamu dengan secret benar dan mengabaikan secret salah', async () => {
    const { board, categoryId } = await createBoard();
    const first = await guestReport(board, categoryId, 'Lampu jalan mati total');
    const second = await guestReport(board, categoryId, 'Selokan tersumbat sampah');
    const siti = await loginAs('siti@example.com', { name: 'Siti' });

    const res = await siti.agent.post('/api/me/reports/claim').send({
      items: [
        { trackingCode: first.trackingCode, secret: first.secret },
        { trackingCode: `tnd-${second.trackingCode.toLowerCase()}`, secret: 'salah' },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ claimed: 1, reportIds: [first.id] });
    expect(await prisma.report.findUnique({ where: { id: first.id } })).toMatchObject({
      userId: siti.user.id,
      isAnonymous: true,
    });
    expect((await prisma.report.findUnique({ where: { id: second.id } })).userId).toBeNull();
    const mine = await siti.agent.get('/api/me/reports');
    expect(mine.body.data.map((item) => item.id)).toEqual([first.id]);
  });

  it('laporan milik akun lain tidak bisa diambil, tamu ditolak, dan body divalidasi', async () => {
    const { board, categoryId } = await createBoard();
    const report = await guestReport(board, categoryId, 'Lampu jalan mati total');
    const budi = await loginAs('budi@example.com');
    const item = { trackingCode: report.trackingCode, secret: report.secret };
    await budi.agent
      .post('/api/me/reports/claim')
      .send({ items: [item] })
      .expect(200);
    const siti = await loginAs('siti@example.com', { name: 'Siti' });

    const stolen = await siti.agent.post('/api/me/reports/claim').send({ items: [item] });
    const guest = await request(app)
      .post('/api/me/reports/claim')
      .send({ items: [item] });
    const empty = await siti.agent.post('/api/me/reports/claim').send({ items: [] });

    expect(stolen.body.data).toEqual({ claimed: 0, reportIds: [] });
    expect((await prisma.report.findUnique({ where: { id: report.id } })).userId).toBe(
      budi.user.id,
    );
    expect(guest.status).toBe(401);
    expect(empty.status).toBe(400);
  });

  it('Laporan Saya bisa dicari dengan kata kunci atau Kode Lacak', async () => {
    const { board, categoryId } = await createBoard();
    const budi = await loginAs('budi@example.com');
    const lamp = await sendReport(budi.agent, board.slug, {
      categoryId,
      title: 'Lampu jalan mati total',
    }).expect(201);
    const source = await prisma.report.findUnique({ where: { id: lamp.body.data.report.id } });
    await cloneReport(source, 1, {
      title: 'Selokan tersumbat',
      description: 'Air meluap ke jalan.',
    });
    const code = lamp.body.data.trackingCode;

    const byWord = await budi.agent.get('/api/me/reports?q=lampu');
    const byCode = await budi.agent.get(`/api/me/reports?q=TND-${code}`);
    const tooShort = await budi.agent.get('/api/me/reports?q=a');

    expect(byWord.body.data.map((item) => item.title)).toEqual(['Lampu jalan mati total']);
    expect(byCode.body.data.map((item) => item.title)).toEqual(['Lampu jalan mati total']);
    expect(tooShort.status).toBe(400);
    expect(byCode.body.data[0].trackingCode).toBe(code);
    const reportId = lamp.body.data.report.id;
    expect((await budi.agent.get(`/api/reports/${reportId}`)).body.data.trackingCode).toBe(code);
    const other = await loginAs('siti@example.com', { name: 'Siti' });
    const seen = await other.agent.get(`/api/reports/${reportId}`);
    expect(seen.body.data).not.toHaveProperty('trackingCode');
    const guestView = await request(app).get(`/api/reports/${reportId}`);
    expect(guestView.body.data).not.toHaveProperty('trackingCode');
  });
});
