import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { recomputeBoardTrust } from '../src/modules/trust/trust.service.js';
import { notifyBoardAdminsNewCandidate } from '../src/modules/notifications/notifications.service.js';
import { createUser, resetDatabase } from './helpers/db.js';

vi.mock('../src/modules/notifications/notifications.service.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, notifyBoardAdminsNewCandidate: vi.fn(async () => {}) };
});

const DAY = 24 * 60 * 60 * 1000;
let app;
let userSeq = 0;

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(notifyBoardAdminsNewCandidate).mockClear();
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

async function createBoard(owner, name = 'Kampus ITS Sukolilo') {
  const res = await owner.agent
    .post('/api/boards')
    .send({
      name,
      city: 'Kota Surabaya',
      type: 'CAMPUS',
      description: 'Laporan fasilitas kampus yang rusak atau perlu perhatian pengelola.',
    })
    .expect(201);
  return res.body.data;
}

async function setup() {
  const owner = await loginAs('owner@example.com');
  const board = await createBoard(owner);
  return { owner, board };
}

async function addRatings(boardId, starsList) {
  for (const stars of starsList) {
    userSeq += 1;
    const user = await createUser({
      email: `rater${userSeq}@example.com`,
      name: `Rater ${userSeq}`,
    });
    await prisma.boardFollower.create({ data: { boardId, userId: user.id } });
    await prisma.boardRating.create({ data: { boardId, userId: user.id, stars } });
  }
}

async function makeCandidate(board, { count = 20, stars = 5, ageDays = 31 } = {}) {
  await prisma.board.update({
    where: { id: board.id },
    data: { createdAt: new Date(Date.now() - ageDays * DAY) },
  });
  await addRatings(board.id, Array(count).fill(stars));
  return recomputeBoardTrust(board.id);
}

async function follow(agent, board) {
  await agent.post(`/api/boards/${board.slug}/follow`).expect(200);
}

describe('Rating Board', () => {
  it('wajib login dan mengikuti Board', async () => {
    const { board } = await setup();
    const user = await loginAs('warga@example.com');

    const guest = await request(app).put(`/api/boards/${board.slug}/rating`).send({ stars: 5 });
    const guestMe = await request(app).get(`/api/boards/${board.slug}/rating/me`);
    const notFollowing = await user.agent
      .put(`/api/boards/${board.slug}/rating`)
      .send({ stars: 5 });
    const meBefore = await user.agent.get(`/api/boards/${board.slug}/rating/me`);
    await follow(user.agent, board);
    const rated = await user.agent
      .put(`/api/boards/${board.slug}/rating`)
      .send({ stars: 4, quickTag: 'RESPONSIVE' });

    expect(guest.status).toBe(401);
    expect(guestMe.body.data).toMatchObject({
      rating: null,
      canRate: false,
      reasonCode: 'LOGIN_REQUIRED',
    });
    expect(notFollowing.status).toBe(403);
    expect(notFollowing.body.error).toMatchObject({
      code: 'RATING_NOT_ALLOWED',
      message: 'Ikuti Board ini dulu untuk memberi rating',
    });
    expect(meBefore.body.data).toMatchObject({ canRate: false, reasonCode: 'NOT_FOLLOWING' });
    expect(rated.status).toBe(200);
    expect(rated.body.data).toMatchObject({
      rating: { stars: 4, quickTag: 'RESPONSIVE' },
      board: { ratingCount: 1, trustLabel: 'NEW', trustScore: 3.2 },
    });
  });

  it('bisa diubah kapan saja tanpa menambah jumlah rating', async () => {
    const { board } = await setup();
    const user = await loginAs('warga@example.com');
    await follow(user.agent, board);

    await user.agent.put(`/api/boards/${board.slug}/rating`).send({ stars: 1 }).expect(200);
    const changed = await user.agent
      .put(`/api/boards/${board.slug}/rating`)
      .send({ stars: 5, quickTag: null });
    const me = await user.agent.get(`/api/boards/${board.slug}/rating/me`);

    expect(changed.status).toBe(200);
    expect(changed.body.data.board.ratingCount).toBe(1);
    expect(me.body.data).toMatchObject({ rating: { stars: 5, quickTag: null }, canRate: true });
  });

  it('Penindak tidak bisa memberi rating ke Board sendiri', async () => {
    const { owner, board } = await setup();
    await prisma.boardFollower.create({ data: { boardId: board.id, userId: owner.user.id } });

    const res = await owner.agent.put(`/api/boards/${board.slug}/rating`).send({ stars: 5 });
    const me = await owner.agent.get(`/api/boards/${board.slug}/rating/me`);

    expect(res.status).toBe(403);
    expect(me.body.data.reasonCode).toBe('BOARD_STAFF');
  });

  it('user ter-ban ditolak, input tidak valid ditolak', async () => {
    const { board } = await setup();
    const user = await loginAs('warga@example.com');
    await follow(user.agent, board);

    const invalid = await user.agent.put(`/api/boards/${board.slug}/rating`).send({ stars: 6 });
    const badTag = await user.agent
      .put(`/api/boards/${board.slug}/rating`)
      .send({ stars: 3, quickTag: 'BAGUS' });
    await prisma.ban.create({
      data: { targetType: 'USER', targetValue: String(user.user.id), reason: 'Spam' },
    });
    const banned = await user.agent.put(`/api/boards/${board.slug}/rating`).send({ stars: 3 });
    const me = await user.agent.get(`/api/boards/${board.slug}/rating/me`);

    expect(invalid.status).toBe(400);
    expect(badTag.status).toBe(400);
    expect(banned.status).toBe(403);
    expect(banned.body.error.code).toBe('ACCOUNT_BANNED');
    expect(me.body.data.reasonCode).toBe('BANNED');
  });

  it('ringkasan berisi distribusi bintang dan pilihan cepat', async () => {
    const { board } = await setup();
    await addRatings(board.id, [5, 5, 4, 1]);
    const rater = await prisma.boardRating.findFirst({ where: { boardId: board.id, stars: 1 } });
    await prisma.boardRating.update({ where: { id: rater.id }, data: { quickTag: 'SLOW' } });
    await recomputeBoardTrust(board.id);

    const res = await request(app).get(`/api/boards/${board.slug}/ratings/summary`);

    expect(res.body.data).toMatchObject({
      ratingCount: 4,
      averageStars: 3.8,
      distribution: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 },
      quickTags: { RESPONSIVE: 0, SLOW: 1, DOUBTFUL: 0 },
      responseRate: null,
    });
  });

  it('detail dan pencarian Board berisi data kepercayaan', async () => {
    const { board } = await setup();
    await addRatings(board.id, [5, 5, 5, 5, 5]);
    await recomputeBoardTrust(board.id);

    const detail = await request(app).get(`/api/boards/${board.slug}`);
    const search = await request(app).get('/api/boards/search?q=Kampus');

    expect(detail.body.data).toMatchObject({
      trustScore: 4,
      trustLabel: 'TRUSTED',
      ratingCount: 5,
      responseRate: null,
      rejectedPercentage: 0,
      verification: 'COMMUNITY',
    });
    expect(search.body.data[0]).toMatchObject({
      trustScore: 4,
      trustLabel: 'TRUSTED',
      ratingCount: 5,
    });
  });
});

describe('Tingkat tanggap dan persentase ditolak', () => {
  it('dihitung ulang saat status laporan berubah', async () => {
    const { owner, board } = await setup();
    const old = new Date(Date.now() - 10 * DAY);
    const reports = [];
    for (const createdAt of [old, old]) {
      reports.push(
        await prisma.report.create({
          data: {
            boardId: board.id,
            categoryId: board.categories[0].id,
            userId: owner.user.id,
            title: 'Laporan lama',
            description: 'Deskripsi laporan yang cukup panjang.',
            locationDetail: 'Gedung A',
            severity: 'LOW',
            trackingCode: generateTrackingCode(),
            trackingSecretHash: sha256('x'),
            createdAt,
          },
        }),
      );
    }

    await owner.agent
      .post(`/api/reports/${reports[0].id}/reject`)
      .send({ reason: 'OUT_OF_SCOPE', note: 'Bukan wewenang' })
      .expect(200);
    const stored = await prisma.board.findUnique({ where: { id: board.id } });

    expect(stored.responseRate).toBe(0);
    expect(stored.rejectedRate).toBe(0.5);
  });
});

describe('Antrean kandidat Official', () => {
  it('Board yang memenuhi syarat masuk antrean dan notifikasi dikirim sekali', async () => {
    const { board } = await setup();

    const updated = await makeCandidate(board);
    await recomputeBoardTrust(board.id);
    const again = await prisma.board.findUnique({ where: { id: board.id } });

    expect(updated.candidateSince).toBeInstanceOf(Date);
    expect(again.candidateSince).toEqual(updated.candidateSince);
    expect(updated.verification).toBe('COMMUNITY');
    expect(notifyBoardAdminsNewCandidate).toHaveBeenCalledTimes(1);
  });

  it('kurang satu rating atau umur kurang tidak masuk antrean', async () => {
    const { board } = await setup();
    expect((await makeCandidate(board, { count: 19 })).candidateSince).toBeNull();

    const { board: young } = {
      board: await createBoard(await loginAs('lain@example.com'), 'Kampus Muda'),
    };
    expect((await makeCandidate(young, { ageDays: 29 })).candidateSince).toBeNull();
  });

  it('candidateSince terhapus saat skor turun atau ada tanda Board Palsu', async () => {
    const { board } = await setup();
    await makeCandidate(board);

    await addRatings(board.id, Array(20).fill(1));
    const dropped = await recomputeBoardTrust(board.id);
    expect(dropped.candidateSince).toBeNull();

    await prisma.boardRating.deleteMany({ where: { boardId: board.id, stars: 1 } });
    expect((await recomputeBoardTrust(board.id)).candidateSince).not.toBeNull();

    const flagger = await loginAs('pelapor@example.com');
    await flagger.agent
      .post('/api/flags')
      .send({ targetType: 'BOARD', targetId: board.id, reason: 'FAKE_BOARD' })
      .expect(201);
    expect((await prisma.board.findUnique({ where: { id: board.id } })).candidateSince).toBeNull();
  });

  it('Board INACTIVE tidak masuk antrean', async () => {
    const { board } = await setup();
    await prisma.board.update({ where: { id: board.id }, data: { status: 'INACTIVE' } });

    const updated = await makeCandidate(board);
    const detail = await request(app).get(`/api/boards/${board.slug}`);

    expect(updated.candidateSince).toBeNull();
    expect(detail.body.data.trustLabel).toBe('INACTIVE');
  });

  it('skor TRUSTED tidak pernah mengubah verification', async () => {
    const { board } = await setup();
    const updated = await makeCandidate(board, { count: 60 });

    expect(updated.trustLabel).toBe('TRUSTED');
    expect(updated.verification).toBe('COMMUNITY');
    expect(updated.verifiedAt).toBeNull();
  });
});

describe('Admin Board', () => {
  async function boardAdmin() {
    return loginAs('boardadmin@tindak.test', { role: 'BOARD_ADMIN' });
  }

  it('hanya BOARD_ADMIN, ADMIN dan USER ditolak', async () => {
    const { owner } = await setup();
    const admin = await loginAs('admin@tindak.test', { role: 'ADMIN' });
    const verifier = await boardAdmin();

    expect((await request(app).get('/api/board-admin/stats')).status).toBe(401);
    expect((await owner.agent.get('/api/board-admin/stats')).status).toBe(403);
    expect((await admin.agent.get('/api/board-admin/candidates')).status).toBe(403);
    expect(
      (await admin.agent.post('/api/board-admin/boards/x/verify').send({ note: 'catatan' })).status,
    ).toBe(403);
    expect((await verifier.agent.get('/api/board-admin/stats')).status).toBe(200);
  });

  it('antrean urut rating terbanyak lalu skor, detail berisi checklist', async () => {
    const owner = await loginAs('owner@example.com');
    const few = await createBoard(owner, 'Kampus Sedikit');
    const many = await createBoard(owner, 'Kampus Banyak');
    await makeCandidate(few, { count: 20 });
    await makeCandidate(many, { count: 25, stars: 4 });
    await addRatings(many.id, [5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    await recomputeBoardTrust(many.id);
    const verifier = await boardAdmin();

    const list = await verifier.agent.get('/api/board-admin/candidates');
    const stats = await verifier.agent.get('/api/board-admin/stats');
    const detail = await verifier.agent.get(`/api/board-admin/boards/${few.slug}`);

    expect(list.body.data.map((item) => item.slug)).toEqual([many.slug, few.slug]);
    expect(list.body.data[0]).toMatchObject({ ratingCount: 35, ageDays: 31 });
    expect(stats.body.data).toMatchObject({ candidates: 2, official: 0, revokedLast30Days: 0 });
    expect(detail.body.data).toMatchObject({
      ratingCount: 20,
      distribution: { 5: 20 },
      owner: { email: 'owner@example.com' },
      isCandidateEligible: true,
      reports: { total: 0, resolved: 0, rejected: 0 },
      history: [],
    });
    expect(detail.body.data.checklist).toHaveLength(7);
    expect(detail.body.data.checklist.every((item) => item.passed)).toBe(true);
  });

  it('Jadikan Official mencatat log dan snapshot, catatan wajib', async () => {
    const { board } = await setup();
    await makeCandidate(board);
    const verifier = await boardAdmin();

    const noNote = await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/verify`)
      .send({});
    const res = await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/verify`)
      .send({ note: 'Pengelola resmi kampus' });
    const again = await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/verify`)
      .send({ note: 'Pengelola resmi kampus' });

    expect(noNote.status).toBe(400);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ verification: 'OFFICIAL', warnings: [] });
    expect(again.status).toBe(409);
    const stored = await prisma.board.findUnique({ where: { id: board.id } });
    expect(stored).toMatchObject({
      verification: 'OFFICIAL',
      verifiedById: verifier.user.id,
      candidateSince: null,
    });
    const log = await prisma.boardVerificationLog.findFirst({ where: { boardId: board.id } });
    expect(log).toMatchObject({
      action: 'GRANTED',
      actorUserId: verifier.user.id,
      reason: 'Pengelola resmi kampus',
      snapshot: { ratingCount: 20, trustScore: 4.6, responseRate: null, rejectedRate: 0 },
    });
    expect(await prisma.auditLog.count({ where: { action: 'BOARD_VERIFIED' } })).toBe(1);
    const detail = await request(app).get(`/api/boards/${board.slug}`);
    expect(detail.body.data.verification).toBe('OFFICIAL');
    expect(detail.body.data.verificationHistory).toEqual([
      expect.objectContaining({ action: 'GRANTED', reason: null }),
    ]);
  });

  it('Jadikan Official Board yang belum memenuhi syarat memberi peringatan, Board beku ditolak', async () => {
    const { board } = await setup();
    const frozen = await createBoard(await loginAs('lain@example.com'), 'Kampus Beku');
    await prisma.board.update({ where: { id: frozen.id }, data: { status: 'FROZEN' } });
    const verifier = await boardAdmin();

    const res = await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/verify`)
      .send({ note: 'Keputusan manual' });
    const frozenRes = await verifier.agent
      .post(`/api/board-admin/boards/${frozen.slug}/verify`)
      .send({ note: 'Keputusan manual' });

    expect(res.status).toBe(200);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining(['Minimal 20 rating', 'Umur Board minimal 30 hari']),
    );
    expect(frozenRes.status).toBe(409);
  });

  it('Lewati mengeluarkan Board dari antrean selama masa jeda', async () => {
    const { board } = await setup();
    await makeCandidate(board);
    const verifier = await boardAdmin();

    const res = await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/skip`)
      .send({ note: 'Cek lagi bulan depan' });
    const list = await verifier.agent.get('/api/board-admin/candidates');

    expect(res.status).toBe(200);
    expect(list.body.data).toEqual([]);
    expect(await prisma.boardVerificationLog.count({ where: { action: 'SKIPPED' } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'BOARD_VERIFICATION_SKIPPED' } })).toBe(
      1,
    );

    const later = await recomputeBoardTrust(board.id, new Date(Date.now() + 31 * DAY));
    expect(later.candidateSince).not.toBeNull();
  });

  it('Cabut Official wajib alasan minimal 10 karakter', async () => {
    const { owner, board } = await setup();
    await makeCandidate(board);
    const verifier = await boardAdmin();
    await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/verify`)
      .send({ note: 'Pengelola resmi' })
      .expect(200);

    const noReason = await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/revoke`)
      .send({});
    const short = await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/revoke`)
      .send({ reason: 'palsu' });
    const res = await verifier.agent
      .post(`/api/board-admin/boards/${board.slug}/revoke`)
      .send({ reason: 'Pengelola tidak lagi resmi' });
    const official = await verifier.agent.get('/api/board-admin/official');
    const ownerView = await owner.agent.get(`/api/boards/${board.slug}`);
    const publicView = await request(app).get(`/api/boards/${board.slug}`);

    expect(noReason.status).toBe(400);
    expect(short.status).toBe(400);
    expect(res.body.data).toEqual({ slug: board.slug, verification: 'COMMUNITY' });
    expect(official.body.data).toEqual([]);
    expect(await prisma.auditLog.count({ where: { action: 'BOARD_VERIFICATION_REVOKED' } })).toBe(
      1,
    );
    expect(ownerView.body.data.verificationHistory.map((log) => [log.action, log.reason])).toEqual([
      ['REVOKED', 'Pengelola tidak lagi resmi'],
      ['GRANTED', 'Pengelola resmi'],
    ]);
    expect(publicView.body.data.verificationHistory).toEqual([
      expect.objectContaining({ action: 'GRANTED', reason: null }),
    ]);
    const stats = await verifier.agent.get('/api/board-admin/stats');
    expect(stats.body.data.revokedLast30Days).toBe(1);
  });

  it('daftar Official dengan filter Perlu Ditinjau Ulang', async () => {
    const owner = await loginAs('owner@example.com');
    const good = await createBoard(owner, 'Kampus Baik');
    const bad = await createBoard(owner, 'Kampus Buruk');
    await addRatings(good.id, Array(10).fill(5));
    await addRatings(bad.id, Array(10).fill(1));
    for (const board of [good, bad]) {
      await prisma.board.update({
        where: { id: board.id },
        data: { verification: 'OFFICIAL', verifiedAt: new Date() },
      });
      await recomputeBoardTrust(board.id);
    }
    const verifier = await boardAdmin();

    const all = await verifier.agent.get('/api/board-admin/official');
    const review = await verifier.agent.get('/api/board-admin/official?review=true');

    expect(all.body.meta.total).toBe(2);
    expect(review.body.data.map((item) => [item.slug, item.needsReview])).toEqual([
      [bad.slug, true],
    ]);
  });

  it('pembekuan Board Official menulis log REVOKED atas nama sistem', async () => {
    const { board } = await setup();
    await prisma.board.update({
      where: { id: board.id },
      data: { verification: 'OFFICIAL', verifiedAt: new Date() },
    });
    const admin = await loginAs('admin@tindak.test', { role: 'ADMIN' });

    await admin.agent
      .post(`/api/admin/boards/${board.slug}/freeze`)
      .send({ reason: 'Board palsu' })
      .expect(200);

    expect(
      await prisma.boardVerificationLog.findFirst({ where: { boardId: board.id } }),
    ).toMatchObject({
      action: 'REVOKED',
      actorUserId: null,
      reason: 'Board dibekukan moderator',
    });
  });
});

describe('Urutan pencarian final', () => {
  it('kecocokan nama, lalu Official, lalu skor tertinggi dengan skor kosong di bawah', async () => {
    const owner = await loginAs('owner@example.com');
    const names = ['Taman Kota A', 'Taman Kota B', 'Taman Kota C', 'Taman Kota D', 'Taman'];
    const boards = {};
    for (const [index, name] of names.entries()) {
      boards[name] = await createBoard(
        index < 3 ? owner : await loginAs(`owner${index}@example.com`),
        name,
      );
    }
    await prisma.board.update({
      where: { id: boards['Taman Kota A'].id },
      data: { trustScore: 2.1 },
    });
    await prisma.board.update({
      where: { id: boards['Taman Kota B'].id },
      data: { trustScore: 4.5 },
    });
    await prisma.board.update({
      where: { id: boards['Taman Kota C'].id },
      data: { trustScore: null },
    });
    await prisma.board.update({
      where: { id: boards['Taman Kota D'].id },
      data: { trustScore: 1.0, verification: 'OFFICIAL' },
    });

    const res = await request(app).get('/api/boards/search?q=Taman');

    expect(res.body.data.map((board) => board.name)).toEqual([
      'Taman',
      'Taman Kota D',
      'Taman Kota B',
      'Taman Kota A',
      'Taman Kota C',
    ]);
  });
});
