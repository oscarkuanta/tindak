import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createUser, resetDatabase } from './helpers/db.js';

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

async function createBoardAs(agent, overrides = {}) {
  const res = await agent
    .post('/api/boards')
    .send({
      name: 'Jalan Rungkut Madya',
      city: 'Kota Surabaya',
      type: 'ROAD',
      description: 'Melayani laporan kerusakan sepanjang Jalan Rungkut Madya.',
      ...overrides,
    })
    .expect(201);
  return res.body.data;
}

async function addHandler(boardId, userId, status = 'ACTIVE') {
  return prisma.boardMember.create({ data: { boardId, userId, role: 'HANDLER', status } });
}

async function setup() {
  const owner = await loginAs('owner@example.com');
  const board = await createBoardAs(owner.agent);
  return { owner, board, base: `/api/boards/${board.slug}` };
}

describe('Ikuti Board', () => {
  it('follow dan unfollow aman diulang, followerCount dan viewer ikut berubah', async () => {
    const { board, base } = await setup();
    const fan = await loginAs('fan@example.com');

    const first = await fan.agent.post(`${base}/follow`);
    const second = await fan.agent.post(`${base}/follow`);
    expect(first.status).toBe(200);
    expect(second.body).toEqual({ data: { notifyLevel: 'ALL' } });
    expect(await prisma.boardFollower.count()).toBe(1);

    const detail = await fan.agent.get(base);
    expect(detail.body.data.followerCount).toBe(1);
    expect(detail.body.data.viewer).toEqual({ isFollowing: true, notifyLevel: 'ALL', role: null });

    const search = await fan.agent.get('/api/boards/search?q=rungkut');
    expect(search.body.data[0]).toMatchObject({
      slug: board.slug,
      followerCount: 1,
      viewer: { isFollowing: true, notifyLevel: 'ALL', role: null },
    });
    const guestSearch = await request(app).get('/api/boards/search?q=rungkut');
    expect(guestSearch.body.data[0]).toMatchObject({ followerCount: 1, viewer: null });

    expect((await fan.agent.delete(`${base}/follow`)).status).toBe(204);
    expect((await fan.agent.delete(`${base}/follow`)).status).toBe(204);
    expect((await fan.agent.get(base)).body.data.followerCount).toBe(0);
  });

  it('mempertahankan notifyLevel saat follow diulang', async () => {
    const { base } = await setup();
    const fan = await loginAs('fan@example.com');
    await fan.agent.post(`${base}/follow`);
    await fan.agent.patch(`${base}/follow`).send({ notifyLevel: 'OFF' });

    const res = await fan.agent.post(`${base}/follow`);

    expect(res.body.data.notifyLevel).toBe('OFF');
  });

  it('mengubah notifyLevel dan memvalidasi nilainya', async () => {
    const { base } = await setup();
    const fan = await loginAs('fan@example.com');

    const notFollowing = await fan.agent.patch(`${base}/follow`).send({ notifyLevel: 'OFF' });
    await fan.agent.post(`${base}/follow`);
    const changed = await fan.agent.patch(`${base}/follow`).send({ notifyLevel: 'DANGEROUS_ONLY' });
    const invalid = await fan.agent.patch(`${base}/follow`).send({ notifyLevel: 'SOMETIMES' });

    expect(notFollowing.status).toBe(404);
    expect(notFollowing.body.error.code).toBe('FOLLOW_NOT_FOUND');
    expect(changed.body).toEqual({ data: { notifyLevel: 'DANGEROUS_ONLY' } });
    expect(invalid.status).toBe(400);
  });

  it('menolak tamu, Penindak Board itu sendiri, dan Board yang tidak ada', async () => {
    const { owner, board, base } = await setup();
    const handler = await loginAs('handler@example.com');
    await addHandler(board.id, handler.user.id);

    expect((await request(app).post(`${base}/follow`)).status).toBe(401);
    expect((await owner.agent.post(`${base}/follow`)).status).toBe(403);
    expect((await handler.agent.post(`${base}/follow`)).status).toBe(403);
    expect((await owner.agent.post('/api/boards/tidak-ada/follow')).status).toBe(404);
  });

  it('GET /me/follows mengurutkan yang terbaru diikuti lebih dulu', async () => {
    const owner = await loginAs('owner@example.com');
    const first = await createBoardAs(owner.agent, { name: 'Board Pertama' });
    const second = await createBoardAs(owner.agent, { name: 'Board Kedua' });
    const fan = await loginAs('fan@example.com');
    await fan.agent.post(`/api/boards/${first.slug}/follow`);
    await fan.agent.post(`/api/boards/${second.slug}/follow`);
    await prisma.boardFollower.updateMany({
      where: { boardId: first.id },
      data: { createdAt: new Date('2026-01-01') },
    });

    const res = await fan.agent.get('/api/me/follows');

    expect(res.status).toBe(200);
    expect(res.body.data.map((item) => item.board.slug)).toEqual([second.slug, first.slug]);
    expect(res.body.data[0]).toMatchObject({
      notifyLevel: 'ALL',
      board: { followerCount: 1, viewer: { isFollowing: true } },
    });
    expect((await request(app).get('/api/me/follows')).status).toBe(401);
  });
});

describe('Undang dan kelola Penindak', () => {
  it('OWNER mengundang user terdaftar menjadi HANDLER INVITED', async () => {
    const { owner, board, base } = await setup();
    const invitee = await loginAs('dewi@example.com', { name: 'Dewi Lestari' });

    const res = await owner.agent.post(`${base}/handlers`).send({ email: ' DEWI@example.com ' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: invitee.user.id,
      role: 'HANDLER',
      status: 'INVITED',
      user: { id: invitee.user.id, name: 'Dewi Lestari', email: 'dewi@example.com' },
    });
    const stored = await prisma.boardMember.findFirst({ where: { userId: invitee.user.id } });
    expect(stored).toMatchObject({ boardId: board.id, invitedById: owner.user.id });
  });

  it('menolak email belum terdaftar, anggota yang sudah ada, dan field asing', async () => {
    const { owner, board, base } = await setup();
    const handler = await loginAs('handler@example.com');
    await addHandler(board.id, handler.user.id);

    const unknown = await owner.agent.post(`${base}/handlers`).send({ email: 'x@example.com' });
    const existing = await owner.agent
      .post(`${base}/handlers`)
      .send({ email: 'handler@example.com' });
    const self = await owner.agent.post(`${base}/handlers`).send({ email: 'owner@example.com' });
    const extra = await owner.agent
      .post(`${base}/handlers`)
      .send({ email: 'handler@example.com', role: 'OWNER' });

    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('USER_NOT_FOUND');
    expect(existing.status).toBe(409);
    expect(existing.body.error.code).toBe('HANDLER_ALREADY_MEMBER');
    expect(self.status).toBe(409);
    expect(extra.status).toBe(400);
  });

  it('membatasi 10 Penindak termasuk undangan', async () => {
    const { owner, board, base } = await setup();
    for (let index = 1; index <= 10; index += 1) {
      const user = await createUser({ email: `h${index}@example.com` });
      await addHandler(board.id, user.id, index % 2 ? 'ACTIVE' : 'INVITED');
    }
    await createUser({ email: 'ke11@example.com' });

    const res = await owner.agent.post(`${base}/handlers`).send({ email: 'ke11@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HANDLER_LIMIT_REACHED');
  });

  it('daftar anggota bisa dilihat OWNER dan HANDLER, tidak oleh user lain', async () => {
    const { owner, board, base } = await setup();
    const handler = await loginAs('handler@example.com');
    const invited = await createUser({ email: 'invited@example.com' });
    const stranger = await loginAs('stranger@example.com');
    await addHandler(board.id, handler.user.id);
    await addHandler(board.id, invited.id, 'INVITED');

    const asOwner = await owner.agent.get(`${base}/handlers`);
    const asHandler = await handler.agent.get(`${base}/handlers`);

    expect(asOwner.status).toBe(200);
    expect(asOwner.body.data.map((member) => [member.user.email, member.status])).toEqual([
      ['handler@example.com', 'ACTIVE'],
      ['invited@example.com', 'INVITED'],
    ]);
    expect(asHandler.status).toBe(200);
    expect((await stranger.agent.get(`${base}/handlers`)).status).toBe(403);
    expect((await request(app).get(`${base}/handlers`)).status).toBe(401);
  });

  it('HANDLER tidak boleh mengundang, mencabut, atau mengalihkan kepemilikan', async () => {
    const { owner, board, base } = await setup();
    const handler = await loginAs('handler@example.com');
    await addHandler(board.id, handler.user.id);
    await createUser({ email: 'lain@example.com' });

    expect(
      (await handler.agent.post(`${base}/handlers`).send({ email: 'lain@example.com' })).status,
    ).toBe(403);
    expect((await handler.agent.delete(`${base}/handlers/${owner.user.id}`)).status).toBe(403);
    expect(
      (await handler.agent.post(`${base}/transfer`).send({ userId: handler.user.id })).status,
    ).toBe(403);
  });

  it('mencabut Penindak aktif dan membatalkan undangan', async () => {
    const { owner, board, base } = await setup();
    const active = await createUser({ email: 'aktif@example.com' });
    const invited = await createUser({ email: 'undang@example.com' });
    await addHandler(board.id, active.id);
    await addHandler(board.id, invited.id, 'INVITED');

    expect((await owner.agent.delete(`${base}/handlers/${active.id}`)).status).toBe(204);
    expect((await owner.agent.delete(`${base}/handlers/${invited.id}`)).status).toBe(204);
    expect(await prisma.boardMember.count({ where: { boardId: board.id } })).toBe(1);

    const again = await owner.agent.delete(`${base}/handlers/${active.id}`);
    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('HANDLER_NOT_FOUND');
  });

  it('OWNER tidak bisa mencabut dirinya sendiri', async () => {
    const { owner, base } = await setup();

    const res = await owner.agent.delete(`${base}/handlers/${owner.user.id}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_REMOVE_OWNER');
  });
});

describe('Undangan untuk user', () => {
  async function invitedSetup() {
    const { owner, board, base } = await setup();
    const invitee = await loginAs('dewi@example.com');
    await owner.agent.post(`${base}/handlers`).send({ email: 'dewi@example.com' }).expect(201);
    const invitation = await prisma.boardMember.findFirst({
      where: { userId: invitee.user.id },
    });
    return { owner, board, base, invitee, invitation };
  }

  it('menampilkan undangan yang menunggu jawaban', async () => {
    const { board, invitee, invitation } = await invitedSetup();

    const res = await invitee.agent.get('/api/me/invitations');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        id: invitation.id,
        board: expect.objectContaining({ slug: board.slug, name: board.name }),
      }),
    ]);
  });

  it('menerima undangan: menjadi HANDLER ACTIVE dan berhenti mengikuti Board itu', async () => {
    const { base, invitee, invitation } = await invitedSetup();
    await invitee.agent.post(`${base}/follow`).expect(200);

    const res = await invitee.agent.post(`/api/me/invitations/${invitation.id}/accept`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: 'HANDLER', status: 'ACTIVE' });
    expect(await prisma.boardFollower.count()).toBe(0);
    expect((await invitee.agent.get(base)).body.data.viewer.role).toBe('HANDLER');
    expect((await invitee.agent.get('/api/me/boards')).body.data[0].role).toBe('HANDLER');
    expect((await invitee.agent.get('/api/me/invitations')).body.data).toEqual([]);

    const again = await invitee.agent.post(`/api/me/invitations/${invitation.id}/accept`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVITATION_NOT_PENDING');
  });

  it('menolak undangan menghapusnya', async () => {
    const { invitee, invitation } = await invitedSetup();

    const res = await invitee.agent.post(`/api/me/invitations/${invitation.id}/decline`);

    expect(res.status).toBe(204);
    expect(await prisma.boardMember.findUnique({ where: { id: invitation.id } })).toBeNull();
    const again = await invitee.agent.post(`/api/me/invitations/${invitation.id}/decline`);
    expect(again.status).toBe(404);
  });

  it('undangan milik orang lain dianggap tidak ada', async () => {
    const { invitation } = await invitedSetup();
    const other = await loginAs('other@example.com');

    const accept = await other.agent.post(`/api/me/invitations/${invitation.id}/accept`);
    const decline = await other.agent.post(`/api/me/invitations/${invitation.id}/decline`);

    expect(accept.status).toBe(404);
    expect(accept.body.error.code).toBe('INVITATION_NOT_FOUND');
    expect(decline.status).toBe(404);
    expect((await request(app).get('/api/me/invitations')).status).toBe(401);
  });
});

describe('Alih kepemilikan', () => {
  it('menukar peran dalam satu transaksi tanpa mengubah verification', async () => {
    const { owner, board, base } = await setup();
    const handler = await loginAs('handler@example.com');
    await addHandler(board.id, handler.user.id);
    await prisma.board.update({
      where: { id: board.id },
      data: { verification: 'OFFICIAL', verifiedAt: new Date('2026-05-01') },
    });
    const verifier = await createUser({
      email: 'boardadmin@tindak.test',
      name: 'Admin Board',
      role: 'BOARD_ADMIN',
    });

    const res = await owner.agent.post(`${base}/transfer`).send({ userId: handler.user.id });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      owner: { id: handler.user.id },
      verification: 'OFFICIAL',
      viewer: { role: 'HANDLER' },
    });
    const stored = await prisma.board.findUnique({ where: { id: board.id } });
    expect(stored).toMatchObject({ ownerId: handler.user.id, verification: 'OFFICIAL' });
    expect(stored.verifiedAt.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    const roles = await prisma.boardMember.findMany({
      where: { boardId: board.id },
      orderBy: { userId: 'asc' },
      select: { userId: true, role: true },
    });
    expect(roles).toEqual([
      { userId: owner.user.id, role: 'HANDLER' },
      { userId: handler.user.id, role: 'OWNER' },
    ]);
    const notifications = await prisma.notification.findMany({
      where: { type: 'BOARD_OWNER_CHANGED' },
    });
    expect(notifications).toEqual([
      expect.objectContaining({
        userId: verifier.id,
        data: expect.objectContaining({ boardSlug: board.slug, newOwnerId: handler.user.id }),
      }),
    ]);

    expect((await handler.agent.patch(base).send({ name: 'Nama Pemilik Baru' })).status).toBe(200);
    expect((await owner.agent.patch(base).send({ name: 'Nama Pemilik Lama' })).status).toBe(403);
  });

  it('menolak penerima yang bukan HANDLER ACTIVE', async () => {
    const { owner, board, base } = await setup();
    const invited = await createUser({ email: 'invited@example.com' });
    const stranger = await createUser({ email: 'stranger@example.com' });
    await addHandler(board.id, invited.id, 'INVITED');

    const toInvited = await owner.agent.post(`${base}/transfer`).send({ userId: invited.id });
    const toStranger = await owner.agent.post(`${base}/transfer`).send({ userId: stranger.id });
    const toSelf = await owner.agent.post(`${base}/transfer`).send({ userId: owner.user.id });

    expect(toInvited.status).toBe(404);
    expect(toInvited.body.error.code).toBe('HANDLER_NOT_FOUND');
    expect(toStranger.status).toBe(404);
    expect(toSelf.status).toBe(404);
  });

  it('menolak penerima yang sudah memiliki 3 Board', async () => {
    const { owner, board, base } = await setup();
    const handler = await loginAs('handler@example.com');
    for (const name of ['Board A', 'Board B', 'Board C']) {
      await createBoardAs(handler.agent, { name });
    }
    await addHandler(board.id, handler.user.id);

    const res = await owner.agent.post(`${base}/transfer`).send({ userId: handler.user.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOARD_LIMIT_REACHED');
    expect((await prisma.board.findUnique({ where: { id: board.id } })).ownerId).toBe(
      owner.user.id,
    );
  });

  it('menolak field verification di body transfer', async () => {
    const { owner, board, base } = await setup();
    const handler = await createUser({ email: 'handler@example.com' });
    await addHandler(board.id, handler.id);

    const res = await owner.agent
      .post(`${base}/transfer`)
      .send({ userId: handler.id, verification: 'OFFICIAL' });

    expect(res.status).toBe(400);
    expect((await prisma.board.findUnique({ where: { id: board.id } })).ownerId).toBe(
      owner.user.id,
    );
  });
});

describe('Cari calon Penindak dan undang lewat akun', () => {
  it('mencari lewat nama atau email, menyamarkan email, dan melewatkan anggota', async () => {
    const { owner, board, base } = await setup();
    const ikan = await createUser({ email: 'ikanterbangoff@gmail.com', name: 'Ikanterbang' });
    await createUser({ email: 'lain@gmail.com', name: 'bukan_Ikanterbang' });
    const member = await createUser({ email: 'ikan.member@gmail.com', name: 'Ikan Member' });
    await addHandler(board.id, member.id);

    const byName = await owner.agent.get(`${base}/handlers/candidates?q=ikan`);
    const byEmail = await owner.agent.get(`${base}/handlers/candidates?q=lain@gmail`);
    const short = await owner.agent.get(`${base}/handlers/candidates?q=i`);

    expect(byName.status).toBe(200);
    expect(byName.body.data.map((user) => user.name)).toEqual(['bukan_Ikanterbang', 'Ikanterbang']);
    expect(byName.body.data.find((user) => user.id === ikan.id).email).toBe(
      'ik••••••••••••@gmail.com',
    );
    expect(JSON.stringify(byName.body)).not.toContain('ikanterbangoff@gmail.com');
    expect(byEmail.body.data.map((user) => user.name)).toEqual(['bukan_Ikanterbang']);
    expect(short.status).toBe(400);
  });

  it('OWNER mengundang lewat userId, selain OWNER ditolak mencari', async () => {
    const { owner, base } = await setup();
    const dewi = await loginAs('dewi@example.com', { name: 'Dewi Lestari' });

    const invited = await owner.agent.post(`${base}/handlers`).send({ userId: dewi.user.id });
    const both = await owner.agent
      .post(`${base}/handlers`)
      .send({ userId: dewi.user.id, email: 'dewi@example.com' });
    const neither = await owner.agent.post(`${base}/handlers`).send({});
    const search = await dewi.agent.get(`${base}/handlers/candidates?q=dewi`);
    const guest = await request(app).get(`${base}/handlers/candidates?q=dewi`);

    expect(invited.status).toBe(201);
    expect(invited.body.data).toMatchObject({ userId: dewi.user.id, status: 'INVITED' });
    expect(both.status).toBe(400);
    expect(neither.status).toBe(400);
    expect(neither.body.error.details[0].message).toBe('Pilih akun dari daftar atau isi email');
    expect(search.status).toBe(403);
    expect(guest.status).toBe(401);
  });
});
