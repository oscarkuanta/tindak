import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { io as connect } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { setRealtimeServer } from '../src/lib/realtime.js';
import { attachSocketServer } from '../src/modules/realtime/socket.js';
import { sendNotifications } from '../src/modules/notifications/notify.service.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { createUser, resetDatabase } from './helpers/db.js';

let server;
let io;
let baseUrl;
const sockets = [];

beforeEach(async () => {
  await resetDatabase();
  server = createServer(createApp());
  io = attachSocketServer(server);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

afterEach(async () => {
  sockets.splice(0).forEach((socket) => socket.disconnect());
  await new Promise((resolve) => io.close(resolve));
  setRealtimeServer(null);
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

async function loginCookie(email, overrides = {}) {
  const user = await createUser({ email, name: email.split('@')[0], ...overrides });
  const res = await request(server)
    .post('/api/auth/login')
    .send({ email, password: 'rahasia123' })
    .expect(200);
  return { user, cookie: res.headers['set-cookie'].map((value) => value.split(';')[0]).join('; ') };
}

function open(cookie) {
  const socket = connect(baseUrl, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: cookie ? { cookie } : {},
  });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function nextEvent(socket, event, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Event ${event} tidak diterima`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

async function createBoardWithReport(ownerCookie, overrides = {}) {
  const res = await request(server)
    .post('/api/boards')
    .set('Cookie', ownerCookie)
    .send({
      name: 'Jalan Rungkut Madya',
      city: 'Kota Surabaya',
      type: 'ROAD',
      description: 'Melayani laporan kerusakan sepanjang Jalan Rungkut Madya.',
    })
    .expect(201);
  const board = res.body.data;
  const report = await prisma.report.create({
    data: {
      boardId: board.id,
      categoryId: board.categories[0].id,
      title: 'Laporan uji',
      description: 'Deskripsi laporan uji yang cukup panjang.',
      locationDetail: 'Lokasi uji',
      severity: 'LOW',
      trackingCode: generateTrackingCode(),
      trackingSecretHash: sha256('rahasia'),
      ...overrides,
    },
  });
  return { board, report };
}

describe('Socket.IO', () => {
  it('koneksi dengan session menerima notification:new miliknya saja', async () => {
    const reader = await loginCookie('reader@example.com');
    const socket = await open(reader.cookie);
    const guest = await open();
    let guestGotIt = false;
    guest.on('notification:new', () => {
      guestGotIt = true;
    });

    const received = nextEvent(socket, 'notification:new');
    await new Promise((resolve) => setTimeout(resolve, 50));
    await sendNotifications([reader.user.id], 'BOARD_NEW_REPORT', { reportTitle: 'Halo' });

    expect(await received).toMatchObject({
      type: 'BOARD_NEW_REPORT',
      isRead: false,
      data: { reportTitle: 'Halo' },
    });
    expect(guestGotIt).toBe(false);
  });

  it('room laporan: publik boleh, tersembunyi hanya dengan Kode Lacak', async () => {
    const owner = await loginCookie('owner@example.com');
    const { report } = await createBoardWithReport(owner.cookie, { isHidden: true });
    const guest = await open();

    const denied = await emitAck(guest, 'report:subscribe', { id: report.id });
    const allowed = await emitAck(guest, 'report:subscribe', {
      id: report.id,
      trackingCode: report.trackingCode,
      secret: 'rahasia',
    });

    expect(denied).toEqual({ ok: false });
    expect(allowed).toEqual({ ok: true });
  });

  it('perubahan status oleh Penindak sampai ke halaman pelapor tamu', async () => {
    const owner = await loginCookie('owner@example.com');
    const { board, report } = await createBoardWithReport(owner.cookie);
    const guest = await open();
    expect(await emitAck(guest, 'report:subscribe', { id: report.id })).toEqual({ ok: true });
    expect(await emitAck(guest, 'board:subscribe', board.slug)).toEqual({ ok: true });

    const updated = nextEvent(guest, 'report:updated');
    await request(server)
      .post(`/api/reports/${report.id}/process`)
      .set('Cookie', owner.cookie)
      .send({ assigneeId: owner.user.id })
      .expect(200);

    expect(await updated).toMatchObject({
      id: report.id,
      boardSlug: board.slug,
      status: 'IN_PROGRESS',
      supportCount: 1,
    });
  });

  it('Board beku tidak bisa di-subscribe tamu', async () => {
    const owner = await loginCookie('owner@example.com');
    const { board } = await createBoardWithReport(owner.cookie);
    await prisma.board.update({ where: { id: board.id }, data: { status: 'FROZEN' } });
    const guest = await open();

    expect(await emitAck(guest, 'board:subscribe', board.slug)).toEqual({ ok: false });
  });
});

describe('Satu link untuk deploy', () => {
  it('server menyajikan frontend hasil build dan tetap melayani API', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'tindak-client-'));
    await writeFile(path.join(dir, 'index.html'), '<div id="root"></div>');
    await writeFile(path.join(dir, 'app.js'), 'export {};');
    const app = createApp({ clientDir: dir });

    const page = await request(app).get('/laporan/12');
    const asset = await request(app).get('/app.js');
    const api = await request(app).get('/api/tidak-ada');

    expect(page.status).toBe(200);
    expect(page.text).toContain('id="root"');
    expect(page.headers['content-security-policy']).toContain('challenges.cloudflare.com');
    expect(asset.status).toBe(200);
    expect(api.status).toBe(404);
    expect(api.body.error.code).toBe('NOT_FOUND');
    await rm(dir, { recursive: true, force: true });
  });
});
