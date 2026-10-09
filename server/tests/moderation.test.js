import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { uploadDir } from '../src/lib/storage.js';
import { scoreImage } from '../src/lib/nsfw.js';
import { findActiveBan } from '../src/lib/bans.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import {
  flagWeightFor,
  hideDecision,
  openFakeBoardFlagCount,
} from '../src/modules/moderation/flags.service.js';
import {
  maskHash,
  purgeOldIpHashes,
  unfreezeExpiredBoards,
} from '../src/modules/moderation/admin.service.js';
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
  vi.mocked(scoreImage).mockReset().mockResolvedValue(null);
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
  const admin = await loginAs('admin@tindak.test', { role: 'ADMIN' });
  const res = await owner.agent
    .post('/api/boards')
    .send({
      name: 'Jalan Rungkut Madya',
      city: 'Kota Surabaya',
      type: 'ROAD',
      description: 'Melayani laporan kerusakan sepanjang Jalan Rungkut Madya.',
    })
    .expect(201);
  return { owner, admin, board: res.body.data };
}

async function insertReport(board, overrides = {}) {
  return prisma.report.create({
    data: {
      boardId: board.id,
      categoryId: board.categories[0].id,
      isAnonymous: true,
      guestTokenHash: 'g'.repeat(64),
      ipHash: 'a1b2c3'.padEnd(60, '0') + 'beef',
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

async function flaggers(count) {
  const users = [];
  for (let index = 1; index <= count; index += 1) {
    users.push(await loginAs(`flagger${index}@example.com`));
  }
  return users;
}

const flagReport = (agent, report, reason, note) =>
  agent.post('/api/flags').send({ targetType: 'REPORT', targetId: report.id, reason, note });

async function reportState(id) {
  return prisma.report.findUnique({
    where: { id },
    select: { isHidden: true, hiddenReason: true, hiddenByHandler: true },
  });
}

function sendGuestReport(agent, board) {
  return agent
    .post(`/api/boards/${board.slug}/reports`)
    .field('title', 'Lubang besar')
    .field('categoryId', String(board.categories[0].id))
    .field('severity', 'MEDIUM')
    .field('locationDetail', 'Depan Indomaret')
    .field('description', 'Lubang selebar satu meter di tengah jalan raya.')
    .field('turnstileToken', 'XXXX.DUMMY.TOKEN.XXXX')
    .attach('photos', photo, { filename: 'a.jpg', contentType: 'image/jpeg' });
}

describe('Tandai Pelanggaran', () => {
  it('hanya user login, satu kali per target, alasan sesuai target', async () => {
    const { board } = await setup();
    const report = await insertReport(board);
    const [user] = await flaggers(1);

    const guest = await request(app)
      .post('/api/flags')
      .send({ targetType: 'REPORT', targetId: report.id, reason: 'SPAM' });
    const created = await flagReport(user.agent, report, 'SPAM', 'iklan jualan');
    const again = await flagReport(user.agent, report, 'HATE');
    const wrongReason = await flagReport(user.agent, report, 'FAKE_BOARD');
    const missing = await user.agent
      .post('/api/flags')
      .send({ targetType: 'REPORT', targetId: 999999, reason: 'SPAM' });

    expect(guest.status).toBe(401);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ reason: 'SPAM', status: 'OPEN', hidden: false });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_FLAGGED');
    expect(wrongReason.status).toBe(400);
    expect(missing.status).toBe(404);
  });

  it('maksimal 20 tanda per hari', async () => {
    const { board } = await setup();
    const [user] = await flaggers(1);
    for (let index = 0; index < 20; index += 1) {
      await prisma.flag.create({
        data: {
          targetType: 'REPORT',
          targetId: 10_000 + index,
          userId: user.user.id,
          reason: 'SPAM',
        },
      });
    }
    const report = await insertReport(board);

    const res = await flagReport(user.agent, report, 'SPAM');

    expect(res.status).toBe(429);
  });
});

describe('Sembunyi otomatis', () => {
  it('2 tanda seksual/kekerasan menyembunyikan, 1 belum', async () => {
    const { board } = await setup();
    const report = await insertReport(board);
    const [a, b] = await flaggers(2);

    await flagReport(a.agent, report, 'SEXUAL').expect(201);
    expect((await reportState(report.id)).isHidden).toBe(false);
    const second = await flagReport(b.agent, report, 'VIOLENCE');

    expect(second.body.data.hidden).toBe(true);
    expect(await reportState(report.id)).toEqual({
      isHidden: true,
      hiddenReason: 'FLAGS',
      hiddenByHandler: false,
    });
    const audit = await prisma.auditLog.findFirst({ where: { action: 'REPORT_AUTO_HIDDEN' } });
    expect(audit).toMatchObject({ targetType: 'REPORT', targetId: report.id });
  });

  it('3 tanda alasan lain menyembunyikan, 2 belum', async () => {
    const { board } = await setup();
    const report = await insertReport(board);
    const [a, b, c] = await flaggers(3);

    await flagReport(a.agent, report, 'SPAM').expect(201);
    await flagReport(b.agent, report, 'HATE').expect(201);
    expect((await reportState(report.id)).isHidden).toBe(false);
    await flagReport(c.agent, report, 'NOT_COMPLAINT').expect(201);

    expect((await reportState(report.id)).hiddenReason).toBe('FLAGS');
  });

  it('1 tanda dari Penindak Board itu langsung menyembunyikan', async () => {
    const { owner, board } = await setup();
    const report = await insertReport(board);

    await flagReport(owner.agent, report, 'SPAM').expect(201);

    expect(await reportState(report.id)).toEqual({
      isHidden: true,
      hiddenReason: 'HANDLER_FLAG',
      hiddenByHandler: true,
    });
  });

  it('penyalahguna (5 tanda ditolak dalam 30 hari) memberi bobot 0', async () => {
    const { board } = await setup();
    const report = await insertReport(board);
    const [abuser, b, c] = await flaggers(3);
    for (let index = 0; index < 5; index += 1) {
      await prisma.flag.create({
        data: {
          targetType: 'REPORT',
          targetId: 20_000 + index,
          userId: abuser.user.id,
          reason: 'SPAM',
          status: 'REJECTED',
          resolvedAt: new Date(Date.now() - 2 * DAY),
          createdAt: new Date(Date.now() - 3 * DAY),
        },
      });
    }

    expect(await flagWeightFor(abuser.user.id)).toBe(0);
    await flagReport(abuser.agent, report, 'SPAM').expect(201);
    await flagReport(b.agent, report, 'SPAM').expect(201);
    await flagReport(c.agent, report, 'HATE').expect(201);

    expect((await reportState(report.id)).isHidden).toBe(false);
    const stored = await prisma.flag.findFirst({
      where: { userId: abuser.user.id, targetId: report.id },
    });
    expect(stored.weight).toBe(0);
  });

  it('hideDecision mengabaikan tanda sistem NSFW', () => {
    expect(hideDecision([{ reason: 'SYSTEM_NSFW', weight: 5 }])).toBeNull();
    expect(
      hideDecision([
        { reason: 'SEXUAL', weight: 1 },
        { reason: 'VIOLENCE', weight: 1 },
      ]),
    ).toBe('FLAGS');
    expect(hideDecision([], { flaggedByHandler: true })).toBe('HANDLER_FLAG');
  });
});

describe('Admin: akses', () => {
  it('hanya ADMIN, BOARD_ADMIN dan USER ditolak', async () => {
    const { owner, admin } = await setup();
    const boardAdmin = await loginAs('boardadmin@tindak.test');

    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
    expect((await owner.agent.get('/api/admin/stats')).status).toBe(403);
    expect((await boardAdmin.agent.get('/api/admin/stats')).status).toBe(403);
    expect((await boardAdmin.agent.get('/api/admin/moderation')).status).toBe(403);

    const stats = await admin.agent.get('/api/admin/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.data).toMatchObject({
      users: { total: 3 },
      boards: { total: 1, active: 1, frozen: 0, official: 0 },
      bans: { active: 0 },
    });
  });
});

describe('Admin: antrean moderasi', () => {
  it('mengurutkan alasan terberat lalu jumlah tanda, dengan IP tersamar dan riwayat', async () => {
    const { owner, admin, board } = await setup();
    const spam = await insertReport(board, { title: 'Spam' });
    const sexual = await insertReport(board, { title: 'Seksual' });
    const [a, b] = await flaggers(2);
    await flagReport(a.agent, spam, 'SPAM').expect(201);
    await flagReport(b.agent, spam, 'SPAM').expect(201);
    await flagReport(a.agent, sexual, 'SEXUAL', 'tidak pantas').expect(201);

    const res = await admin.agent.get('/api/admin/moderation');
    const handlerTry = await owner.agent.get('/api/admin/moderation');

    expect(res.status).toBe(200);
    expect(res.body.data.map((item) => item.report.title)).toEqual(['Seksual', 'Spam']);
    expect(res.body.data[0]).toMatchObject({
      targetType: 'REPORT',
      worstReason: 'SEXUAL',
      flagCount: 1,
      flags: [
        expect.objectContaining({
          reason: 'SEXUAL',
          note: 'tidak pantas',
          flagger: { id: a.user.id, name: 'flagger1' },
        }),
      ],
      report: {
        reporterType: 'GUEST',
        reporter: null,
        ipHashMasked: 'a1b2c3…beef',
        history: { totalReports: 2, removedReports: 0, hiddenReports: 0, bans: [] },
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('a1b2c3'.padEnd(60, '0'));
    expect(handlerTry.status).toBe(403);
  });

  it('laporan dengan foto diburamkan masuk antrean sebagai tanda sistem', async () => {
    const { admin, board } = await setup();
    vi.mocked(scoreImage).mockResolvedValueOnce(0.5);
    await sendGuestReport(request.agent(app), board).expect(201);

    const res = await admin.agent.get('/api/admin/moderation?reason=SYSTEM_NSFW');

    expect(res.body.data).toEqual([
      expect.objectContaining({
        worstReason: 'SYSTEM_NSFW',
        flags: [expect.objectContaining({ weight: 0, flagger: null })],
      }),
    ]);
    expect(res.body.data[0].report.media[0]).toMatchObject({ isBlurred: true, nsfwScore: 0.5 });
  });
});

describe('Admin: pulihkan dan hapus', () => {
  it('memulihkan laporan yang disembunyikan Penindak dan menambah hitungan Board', async () => {
    const { owner, admin, board } = await setup();
    const report = await insertReport(board);
    await flagReport(owner.agent, report, 'SPAM').expect(201);

    const res = await admin.agent.post(`/api/admin/reports/${report.id}/restore`).send({});

    expect(res.status).toBe(200);
    expect(await reportState(report.id)).toEqual({
      isHidden: false,
      hiddenReason: null,
      hiddenByHandler: false,
    });
    expect((await prisma.flag.findFirst({ where: { targetId: report.id } })).status).toBe(
      'REJECTED',
    );
    const detail = await request(app).get(`/api/boards/${board.slug}`);
    expect(detail.body.data.restoredByAdminCount).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { action: 'REPORT_RESTORED', actorUserId: admin.user.id },
      }),
    ).toBe(1);
  });

  it('Hapus + Ban perangkat dan IP dari laporan tamu', async () => {
    const { admin, board } = await setup();
    const guest = request.agent(app);
    const created = await sendGuestReport(guest, board).expect(201);
    const id = created.body.data.report.id;

    const removed = await admin.agent.post(`/api/admin/reports/${id}/remove`).send({
      note: 'spam',
      ban: { targetType: 'GUEST_TOKEN', duration: '7d', reason: 'Spam berulang' },
    });
    const ipBan = await admin.agent
      .post('/api/admin/bans')
      .send({ targetType: 'IP', reportId: id, duration: '1d', reason: 'Spam dari jaringan ini' });

    expect(removed.status).toBe(200);
    expect(removed.body.data.ban).toMatchObject({ targetType: 'GUEST_TOKEN', isActive: true });
    expect(removed.body.data.ban.target).toMatch(/^[0-9a-f]{6}…[0-9a-f]{4}$/);
    expect(ipBan.status).toBe(201);
    expect((await request(app).get(`/api/reports/${id}`)).status).toBe(404);
    expect((await admin.agent.get(`/api/reports/${id}`)).status).toBe(200);

    await prisma.report.updateMany({ data: { createdAt: new Date(Date.now() - 2 * DAY) } });
    const blocked = await sendGuestReport(guest, board);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ACCOUNT_BANNED');
    expect(blocked.body.error.message).toMatch(/berakhir dalam/);
  });

  it('ban akun dari laporan tamu ditolak, ban IP permanen dan 30 hari ditolak', async () => {
    const { admin, board } = await setup();
    const report = await insertReport(board);

    const userBan = await admin.agent
      .post('/api/admin/bans')
      .send({ targetType: 'USER', reportId: report.id, duration: '1d', reason: 'coba' });
    const permanentIp = await admin.agent
      .post('/api/admin/bans')
      .send({ targetType: 'IP', reportId: report.id, duration: 'permanent', reason: 'coba' });
    const monthIp = await admin.agent
      .post('/api/admin/bans')
      .send({ targetType: 'IP', reportId: report.id, duration: '30d', reason: 'coba' });

    expect(userBan.status).toBe(400);
    expect(permanentIp.status).toBe(400);
    expect(permanentIp.body.error.details[0].message).toBe('Ban IP hanya boleh 1 hari atau 7 hari');
    expect(monthIp.status).toBe(400);
  });
});

describe('Ban akun', () => {
  it('user ter-ban tidak bisa login, dengan sisa waktu', async () => {
    const { admin } = await setup();
    const target = await createUser({ email: 'nakal@example.com' });

    const banned = await admin.agent
      .post('/api/admin/bans')
      .send({ targetType: 'USER', userId: target.id, duration: '7d', reason: 'Spam' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nakal@example.com', password: 'rahasia123' });

    expect(banned.status).toBe(201);
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_BANNED');
    expect(login.body.error.message).toMatch(/berakhir dalam 7 hari|berakhir dalam 6 hari/);
    expect(login.body.error.details[0].field).toBe('bannedUntil');
  });

  it('ban di tengah sesi menolak dukung, buat Board, dan tanda; ban dicabut atau kedaluwarsa tidak berlaku', async () => {
    const { board } = await setup();
    const report = await insertReport(board);
    const user = await loginAs('nakal@example.com');
    const ban = await prisma.ban.create({
      data: {
        targetType: 'USER',
        targetValue: String(user.user.id),
        reason: 'Spam',
        expiresAt: null,
      },
    });

    const support = await user.agent.put(`/api/reports/${report.id}/support`);
    const createBoard = await user.agent.post('/api/boards').send({});
    const flag = await flagReport(user.agent, report, 'SPAM');

    expect(support.status).toBe(403);
    expect(support.body.error.message).toBe(
      'Kamu diblokir permanen karena melanggar aturan komunitas.',
    );
    expect(createBoard.status).toBe(403);
    expect(flag.status).toBe(403);

    await prisma.ban.update({ where: { id: ban.id }, data: { revokedAt: new Date() } });
    expect((await user.agent.put(`/api/reports/${report.id}/support`)).status).toBe(200);

    await prisma.ban.create({
      data: {
        targetType: 'USER',
        targetValue: String(user.user.id),
        reason: 'Lama',
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    expect(await findActiveBan({ userId: user.user.id })).toBeNull();
  });

  it('daftar ban dan cabut ban', async () => {
    const { admin } = await setup();
    const target = await createUser({ email: 'nakal@example.com', name: 'Nakal' });
    const created = await admin.agent
      .post('/api/admin/bans')
      .send({ targetType: 'USER', userId: target.id, duration: '1d', reason: 'Spam' });

    const list = await admin.agent.get('/api/admin/bans');
    const revoked = await admin.agent.delete(`/api/admin/bans/${created.body.data.id}`);
    const activeAfter = await admin.agent.get('/api/admin/bans');
    const all = await admin.agent.get('/api/admin/bans?active=false');

    expect(list.body.data[0]).toMatchObject({
      target: 'Nakal (nakal@example.com)',
      isActive: true,
    });
    expect(revoked.body.data.isActive).toBe(false);
    expect(activeAfter.body.data).toEqual([]);
    expect(all.body.meta.total).toBe(1);
    const users = await admin.agent.get('/api/admin/users?q=nakal');
    expect(users.body.data[0]).toMatchObject({ email: 'nakal@example.com', activeBan: null });
  });

  it('Admin tidak bisa di-ban', async () => {
    const { admin } = await setup();

    const res = await admin.agent
      .post('/api/admin/bans')
      .send({ targetType: 'USER', userId: admin.user.id, duration: '1d', reason: 'coba' });

    expect(res.status).toBe(403);
  });
});

describe('Admin: kelola Board', () => {
  it('membekukan Board Official mencabut status Official, mencairkan tidak mengembalikan', async () => {
    const { admin, board } = await setup();
    const boardAdmin = await createUser({ email: 'boardadmin@tindak.test', role: 'BOARD_ADMIN' });
    await prisma.board.update({
      where: { id: board.id },
      data: { verification: 'OFFICIAL', verifiedAt: new Date(), verifiedById: boardAdmin.id },
    });
    const [fan] = await flaggers(1);
    await fan.agent
      .post('/api/flags')
      .send({ targetType: 'BOARD', targetId: board.id, reason: 'FAKE_BOARD' })
      .expect(201);
    expect(await openFakeBoardFlagCount(board.id)).toBe(1);

    const frozen = await admin.agent
      .post(`/api/admin/boards/${board.slug}/freeze`)
      .send({ reason: 'Board palsu', duration: 'permanent' });
    const again = await admin.agent
      .post(`/api/admin/boards/${board.slug}/freeze`)
      .send({ reason: 'Board palsu', duration: 'permanent' });

    expect(frozen.body.data).toMatchObject({
      status: 'FROZEN',
      frozenUntil: null,
      verificationRevoked: true,
    });
    expect(again.status).toBe(409);
    const stored = await prisma.board.findUnique({ where: { id: board.id } });
    expect(stored).toMatchObject({
      status: 'FROZEN',
      verification: 'COMMUNITY',
      verifiedAt: null,
      verifiedById: null,
    });
    expect(await openFakeBoardFlagCount(board.id)).toBe(0);
    expect(
      await prisma.auditLog.findFirst({
        where: { action: 'BOARD_VERIFICATION_REVOKED_BY_FREEZE' },
      }),
    ).toMatchObject({ targetType: 'BOARD', targetId: board.id, actorUserId: admin.user.id });
    expect((await request(app).get(`/api/boards/${board.slug}`)).status).toBe(404);

    const unfrozen = await admin.agent.post(`/api/admin/boards/${board.slug}/unfreeze`);
    expect(unfrozen.body.data).toEqual({
      slug: board.slug,
      status: 'ACTIVE',
      verification: 'COMMUNITY',
    });
  });

  it('freeze 7 hari mengisi frozenUntil lalu otomatis unfreeze saat waktunya habis', async () => {
    const { admin, board } = await setup();

    const noDuration = await admin.agent
      .post(`/api/admin/boards/${board.slug}/freeze`)
      .send({ reason: 'Board spam' });
    const before = Date.now();
    const frozen = await admin.agent
      .post(`/api/admin/boards/${board.slug}/freeze`)
      .send({ reason: 'Board spam', duration: '7d' });
    const until = new Date(frozen.body.data.frozenUntil).getTime();

    expect(noDuration.status).toBe(400);
    expect(noDuration.body.error.details[0].message).toBe('Pilih durasi freeze');
    expect(frozen.status).toBe(200);
    expect(until - before).toBeGreaterThanOrEqual(7 * DAY - 5000);
    expect(until - before).toBeLessThanOrEqual(7 * DAY + 5000);
    expect(await unfreezeExpiredBoards(new Date(before + 6 * DAY))).toBe(0);

    expect(await unfreezeExpiredBoards(new Date(before + 8 * DAY))).toBe(1);
    const stored = await prisma.board.findUnique({ where: { id: board.id } });
    expect(stored).toMatchObject({ status: 'ACTIVE', frozenUntil: null });
    expect(await prisma.auditLog.findFirst({ where: { action: 'BOARD_UNFROZEN' } })).toMatchObject({
      actorUserId: null,
      data: expect.objectContaining({ automatic: true }),
    });
    expect((await request(app).get(`/api/boards/${board.slug}`)).status).toBe(200);
  });

  it('freeze permanen tidak di-unfreeze otomatis', async () => {
    const { admin, board } = await setup();
    await admin.agent
      .post(`/api/admin/boards/${board.slug}/freeze`)
      .send({ reason: 'Board palsu', duration: 'permanent' })
      .expect(200);

    expect(await unfreezeExpiredBoards(new Date(Date.now() + 365 * DAY))).toBe(0);
    expect((await prisma.board.findUnique({ where: { id: board.id } })).status).toBe('FROZEN');
  });

  it('Penindak tidak bisa menandai Board yang dikelolanya sendiri', async () => {
    const { owner, board } = await setup();

    const res = await owner.agent
      .post('/api/flags')
      .send({ targetType: 'BOARD', targetId: board.id, reason: 'FAKE_BOARD' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe(
      'Penindak tidak bisa menandai Board yang dikelolanya sendiri',
    );
    expect(await prisma.flag.count()).toBe(0);
  });

  it('mengabaikan tanda Board Palsu', async () => {
    const { admin, board } = await setup();
    const [fan] = await flaggers(1);
    await fan.agent
      .post('/api/flags')
      .send({ targetType: 'BOARD', targetId: board.id, reason: 'FAKE_BOARD' })
      .expect(201);

    const list = await admin.agent.get('/api/admin/boards');
    await admin.agent.post(`/api/admin/boards/${board.slug}/dismiss-flags`).send({}).expect(200);

    expect(list.body.data[0]).toMatchObject({ fakeBoardFlagCount: 1, openFlagCount: 1 });
    expect(await openFakeBoardFlagCount(board.id)).toBe(0);
  });

  it('Admin tidak bisa mengubah verification lewat endpoint mana pun', async () => {
    const { admin, board } = await setup();

    const patch = await admin.agent
      .patch(`/api/boards/${board.slug}`)
      .send({ verification: 'OFFICIAL' });
    const freezeWithField = await admin.agent
      .post(`/api/admin/boards/${board.slug}/freeze`)
      .send({ reason: 'coba', duration: 'permanent', verification: 'OFFICIAL' });

    expect(patch.status).toBe(403);
    expect(freezeWithField.status).toBe(400);
    expect((await prisma.board.findUnique({ where: { id: board.id } })).verification).toBe(
      'COMMUNITY',
    );
  });
});

describe('Audit log dan job', () => {
  it('mencatat aksi Penindak dan bisa difilter', async () => {
    const { owner, admin, board } = await setup();
    const report = await insertReport(board);
    await owner.agent
      .post(`/api/reports/${report.id}/process`)
      .send({ assigneeId: owner.user.id })
      .expect(200);

    const res = await admin.agent.get('/api/admin/audit-logs?action=REPORT_PROCESSED');

    expect(res.body.data).toEqual([
      expect.objectContaining({
        action: 'REPORT_PROCESSED',
        targetType: 'REPORT',
        targetId: report.id,
        actor: { id: owner.user.id, name: 'owner' },
      }),
    ]);
  });

  it('menghapus ipHash lebih dari 90 hari kecuali dipakai ban IP aktif', async () => {
    const { board } = await setup();
    const old = await insertReport(board, {
      ipHash: '1'.repeat(64),
      createdAt: new Date(Date.now() - 91 * DAY),
    });
    const protectedOld = await insertReport(board, {
      ipHash: '2'.repeat(64),
      createdAt: new Date(Date.now() - 91 * DAY),
    });
    const recent = await insertReport(board, { ipHash: '3'.repeat(64) });
    await prisma.ban.create({
      data: {
        targetType: 'IP',
        targetValue: '2'.repeat(64),
        reason: 'aktif',
        expiresAt: new Date(Date.now() + DAY),
      },
    });

    expect(await purgeOldIpHashes()).toBe(1);
    const rows = await prisma.report.findMany({
      where: { id: { in: [old.id, protectedOld.id, recent.id] } },
      orderBy: { id: 'asc' },
      select: { ipHash: true },
    });
    expect(rows.map((row) => row.ipHash)).toEqual([null, '2'.repeat(64), '3'.repeat(64)]);
  });

  it('maskHash memperlihatkan 6 karakter awal dan 4 akhir', () => {
    expect(maskHash('abcdef1234567890')).toBe('abcdef…7890');
    expect(maskHash(null)).toBeNull();
  });
});
