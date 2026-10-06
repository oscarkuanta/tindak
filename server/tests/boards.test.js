import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createUser, resetDatabase } from './helpers/db.js';

const validBoard = {
  name: 'Jalan Rungkut Madya',
  city: 'Kota Surabaya',
  type: 'ROAD',
  managerTitle: 'Ketua RT 05',
  description: 'Melayani laporan kerusakan sepanjang Jalan Rungkut Madya.',
};

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
  const user = await createUser({ email, name: overrides.name ?? 'Pengguna Uji', ...overrides });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'rahasia123' }).expect(200);
  return { user, agent };
}

async function createBoardAs(agent, overrides = {}) {
  const res = await agent
    .post('/api/boards')
    .send({ ...validBoard, ...overrides })
    .expect(201);
  return res.body.data;
}

async function insertBoard(ownerId, overrides = {}) {
  return prisma.board.create({
    data: {
      slug: `board-${Math.random().toString(36).slice(2, 10)}`,
      name: 'Board Uji',
      city: 'Kota Surabaya',
      type: 'OTHER',
      description: 'Deskripsi board uji yang cukup panjang.',
      ownerId,
      ...overrides,
    },
  });
}

describe('POST /api/boards', () => {
  it('membuat Board Komunitas, OWNER tercatat, kategori bawaan, dan slug benar', async () => {
    const { user, agent } = await loginAs('budi@example.com');

    const board = await createBoardAs(agent, { extraCategories: ['Parkir Liar'] });

    expect(board).toMatchObject({
      slug: 'jalan-rungkut-madya-surabaya',
      name: 'Jalan Rungkut Madya',
      city: 'Kota Surabaya',
      type: 'ROAD',
      verification: 'COMMUNITY',
      verifiedAt: null,
      managerTitle: 'Ketua RT 05',
      dangerousTargetHours: 48,
      status: 'ACTIVE',
      trustScore: null,
      trustLabel: 'NEW',
      handlerCount: 1,
      owner: { id: user.id, name: 'Pengguna Uji', avatarUrl: null },
      viewer: { isFollowing: false, notifyLevel: null, role: 'OWNER' },
    });
    expect(board.categories.map((category) => category.name)).toEqual([
      'Jalan Berlubang',
      'Lampu Jalan',
      'Drainase dan Banjir',
      'Rambu dan Marka',
      'Pohon Tumbang',
      'Lainnya',
      'Parkir Liar',
    ]);
    expect(board.categories.at(-1)).toMatchObject({ isDefault: false });

    const member = await prisma.boardMember.findFirst({ where: { boardId: board.id } });
    expect(member).toMatchObject({ userId: user.id, role: 'OWNER', status: 'ACTIVE' });
  });

  it('memakai kategori bawaan sesuai jenis Board', async () => {
    const { agent } = await loginAs('budi@example.com');

    const board = await createBoardAs(agent, { name: 'SMKN 1 Surabaya', type: 'SCHOOL' });

    expect(board.categories.map((category) => category.name)).toEqual([
      'Kebersihan',
      'Kerusakan Fasilitas',
      'Listrik',
      'Air dan Sanitasi',
      'Keamanan',
      'Lainnya',
    ]);
  });

  it('menolak body yang mengirim verification', async () => {
    const { agent } = await loginAs('budi@example.com');

    const res = await agent.post('/api/boards').send({ ...validBoard, verification: 'OFFICIAL' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toContainEqual({
      field: 'verification',
      message: 'Field ini tidak boleh dikirim',
    });
    expect(await prisma.board.count()).toBe(0);
  });

  it('menolak tamu', async () => {
    const res = await request(app).post('/api/boards').send(validBoard);

    expect(res.status).toBe(401);
  });

  it('menolak kota yang tidak ada di daftar', async () => {
    const { agent } = await loginAs('budi@example.com');

    const res = await agent.post('/api/boards').send({ ...validBoard, city: 'Surabaya' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((detail) => detail.field)).toContain('city');
  });

  it('menolak kategori tambahan yang sama dengan kategori bawaan', async () => {
    const { agent } = await loginAs('budi@example.com');

    const res = await agent
      .post('/api/boards')
      .send({ ...validBoard, extraCategories: ['lampu jalan'] });

    expect(res.status).toBe(400);
  });

  it('menolak Board ke-4 dengan 403 BOARD_LIMIT_REACHED', async () => {
    const { agent } = await loginAs('budi@example.com');
    for (const name of ['Board Satu', 'Board Dua', 'Board Tiga']) {
      await createBoardAs(agent, { name });
    }

    const res = await agent.post('/api/boards').send({ ...validBoard, name: 'Board Empat' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('BOARD_LIMIT_REACHED');
  });

  it('memberi slug berbeda untuk nama dan kota yang sama', async () => {
    const first = await loginAs('budi@example.com');
    const second = await loginAs('siti@example.com');

    const a = await createBoardAs(first.agent);
    const b = await createBoardAs(second.agent);
    const c = await createBoardAs(first.agent);

    expect([a.slug, b.slug, c.slug]).toEqual([
      'jalan-rungkut-madya-surabaya',
      'jalan-rungkut-madya-surabaya-2',
      'jalan-rungkut-madya-surabaya-3',
    ]);
  });
});

describe('GET /api/boards/search', () => {
  let ownerId;

  beforeEach(async () => {
    ownerId = (await createUser({ email: 'owner@example.com' })).id;
  });

  it('mengurutkan diawali q sebelum mengandung q', async () => {
    await insertBoard(ownerId, { name: 'Taman Rungkut', createdAt: new Date('2026-01-03') });
    await insertBoard(ownerId, { name: 'Rungkut Industri', createdAt: new Date('2026-01-01') });

    const res = await request(app).get('/api/boards/search?q=rungkut');

    expect(res.status).toBe(200);
    expect(res.body.data.map((board) => board.name)).toEqual(['Rungkut Industri', 'Taman Rungkut']);
  });

  it('menaruh OFFICIAL di atas COMMUNITY pada tingkat kecocokan yang sama', async () => {
    await insertBoard(ownerId, { name: 'Rungkut Lama', createdAt: new Date('2026-02-01') });
    await insertBoard(ownerId, {
      name: 'Rungkut Baru',
      verification: 'OFFICIAL',
      verifiedAt: new Date(),
      createdAt: new Date('2026-01-01'),
    });

    const res = await request(app).get('/api/boards/search?q=rung');

    expect(res.body.data.map((board) => board.name)).toEqual(['Rungkut Baru', 'Rungkut Lama']);
    expect(res.body.data[0].verification).toBe('OFFICIAL');
  });

  it('memfilter verification dan kota, serta menyembunyikan Board FROZEN', async () => {
    await insertBoard(ownerId, { name: 'Pasar A', verification: 'OFFICIAL' });
    await insertBoard(ownerId, { name: 'Pasar B' });
    await insertBoard(ownerId, { name: 'Pasar C', city: 'Kabupaten Sidoarjo' });
    await insertBoard(ownerId, { name: 'Pasar D', status: 'FROZEN' });

    const official = await request(app).get('/api/boards/search?verification=OFFICIAL');
    const sidoarjo = await request(app).get(
      `/api/boards/search?city=${encodeURIComponent('Kabupaten Sidoarjo')}`,
    );
    const all = await request(app).get('/api/boards/search?q=pasar');

    expect(official.body.data.map((board) => board.name)).toEqual(['Pasar A']);
    expect(sidoarjo.body.data.map((board) => board.name)).toEqual(['Pasar C']);
    expect(all.body.data.map((board) => board.name)).not.toContain('Pasar D');
  });

  it('membagi hasil per halaman', async () => {
    for (let index = 1; index <= 5; index += 1) {
      await insertBoard(ownerId, {
        name: `Halte ${index}`,
        createdAt: new Date(`2026-01-0${index}`),
      });
    }

    const res = await request(app).get('/api/boards/search?q=halte&page=2&pageSize=2');

    expect(res.body.meta).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
    expect(res.body.data.map((board) => board.name)).toEqual(['Halte 3', 'Halte 2']);
    expect(res.body.data[0]).toMatchObject({
      followerCount: 0,
      activeReportCount: 0,
      trustScore: null,
      trustLabel: 'NEW',
    });
  });

  it('menolak q satu karakter dan pageSize di atas 50', async () => {
    expect((await request(app).get('/api/boards/search?q=a')).status).toBe(400);
    expect((await request(app).get('/api/boards/search?pageSize=51')).status).toBe(400);
  });
});

describe('GET /api/boards/similar', () => {
  it('hanya mencari di kota yang sama dan mengabaikan kata umum', async () => {
    const ownerId = (await createUser({ email: 'owner@example.com' })).id;
    await insertBoard(ownerId, { name: 'Jalan Rungkut Madya' });
    await insertBoard(ownerId, { name: 'Jalan Rungkut Madya', city: 'Kabupaten Sidoarjo' });
    await insertBoard(ownerId, { name: 'Jalan Ahmad Yani' });

    const res = await request(app).get(
      `/api/boards/similar?name=${encodeURIComponent('Jl. Rungkut')}&city=${encodeURIComponent('Kota Surabaya')}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ name: 'Jalan Rungkut Madya', city: 'Kota Surabaya' });
  });

  it('menolak kota yang tidak dikenal', async () => {
    const res = await request(app).get('/api/boards/similar?name=Rungkut&city=Atlantis');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/boards/:slug', () => {
  it('mengisi viewer.role untuk OWNER, user lain, dan tamu', async () => {
    const owner = await loginAs('budi@example.com');
    const other = await loginAs('siti@example.com');
    const board = await createBoardAs(owner.agent);

    const asOwner = await owner.agent.get(`/api/boards/${board.slug}`);
    const asOther = await other.agent.get(`/api/boards/${board.slug}`);
    const asGuest = await request(app).get(`/api/boards/${board.slug}`);

    expect(asOwner.body.data.viewer.role).toBe('OWNER');
    expect(asOther.body.data.viewer).toEqual({ isFollowing: false, notifyLevel: null, role: null });
    expect(asGuest.body.data.viewer).toBeNull();
    expect(asGuest.body.data.owner.name).toBe('Pengguna Uji');
  });

  it('menyembunyikan Board FROZEN dari publik, tetapi terlihat untuk ADMIN dan BOARD_ADMIN', async () => {
    const owner = await createUser({ email: 'owner@example.com' });
    await insertBoard(owner.id, { slug: 'board-beku', status: 'FROZEN' });
    const user = await loginAs('biasa@example.com');
    const admin = await loginAs('admin@tindak.test', { role: 'ADMIN' });
    const boardAdmin = await loginAs('boardadmin@tindak.test');

    expect((await request(app).get('/api/boards/board-beku')).status).toBe(404);
    expect((await user.agent.get('/api/boards/board-beku')).status).toBe(404);
    expect((await admin.agent.get('/api/boards/board-beku')).body.data.status).toBe('FROZEN');
    expect((await boardAdmin.agent.get('/api/boards/board-beku')).status).toBe(200);
  });

  it('membalas 404 BOARD_NOT_FOUND untuk slug yang tidak ada', async () => {
    const res = await request(app).get('/api/boards/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BOARD_NOT_FOUND');
  });
});

describe('PATCH /api/boards/:slug', () => {
  it('OWNER bisa mengubah info tanpa mengubah slug', async () => {
    const { agent } = await loginAs('budi@example.com');
    const board = await createBoardAs(agent);

    const res = await agent
      .patch(`/api/boards/${board.slug}`)
      .send({ name: 'Jalan Rungkut Madya Raya', managerTitle: '', dangerousTargetHours: 24 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      slug: 'jalan-rungkut-madya-surabaya',
      name: 'Jalan Rungkut Madya Raya',
      managerTitle: null,
      dangerousTargetHours: 24,
    });
  });

  it('menolak bukan OWNER, tamu, dan field verification atau city', async () => {
    const owner = await loginAs('budi@example.com');
    const other = await loginAs('siti@example.com');
    const board = await createBoardAs(owner.agent);
    const path = `/api/boards/${board.slug}`;

    expect((await other.agent.patch(path).send({ name: 'Nama Baru' })).status).toBe(403);
    expect((await request(app).patch(path).send({ name: 'Nama Baru' })).status).toBe(401);

    const withVerification = await owner.agent.patch(path).send({ verification: 'OFFICIAL' });
    const withCity = await owner.agent.patch(path).send({ city: 'Kabupaten Sidoarjo' });

    expect(withVerification.status).toBe(400);
    expect(withCity.status).toBe(400);
    const stored = await prisma.board.findUnique({ where: { id: board.id } });
    expect(stored).toMatchObject({ verification: 'COMMUNITY', city: 'Kota Surabaya' });
  });

  it('tidak mengubah field yang tidak dikirim', async () => {
    const { agent } = await loginAs('budi@example.com');
    const board = await createBoardAs(agent, { dangerousTargetHours: 12 });

    const res = await agent.patch(`/api/boards/${board.slug}`).send({ name: 'Nama Baru Saja' });

    expect(res.body.data).toMatchObject({
      name: 'Nama Baru Saja',
      dangerousTargetHours: 12,
      managerTitle: 'Ketua RT 05',
    });
  });

  it('menolak body kosong', async () => {
    const { agent } = await loginAs('budi@example.com');
    const board = await createBoardAs(agent);

    expect((await agent.patch(`/api/boards/${board.slug}`).send({})).status).toBe(400);
  });
});

describe('Kategori Board', () => {
  it('menambah kategori di urutan terakhir dan menolak duplikat', async () => {
    const { agent } = await loginAs('budi@example.com');
    const board = await createBoardAs(agent);
    const path = `/api/boards/${board.slug}/categories`;

    const created = await agent.post(path).send({ name: 'Parkir Liar' });
    const duplicate = await agent.post(path).send({ name: 'parkir liar' });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      name: 'Parkir Liar',
      isDefault: false,
      sortOrder: 6,
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CATEGORY_EXISTS');
  });

  it('menolak kategori ke-21', async () => {
    const { agent } = await loginAs('budi@example.com');
    const board = await createBoardAs(agent);
    for (let index = 1; index <= 14; index += 1) {
      await agent
        .post(`/api/boards/${board.slug}/categories`)
        .send({ name: `Kategori ${index}` })
        .expect(201);
    }

    const res = await agent
      .post(`/api/boards/${board.slug}/categories`)
      .send({ name: 'Kategori 15' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CATEGORY_LIMIT_REACHED');
  });

  it('mengganti nama dan urutan, tetapi melindungi "Lainnya"', async () => {
    const { agent } = await loginAs('budi@example.com');
    const board = await createBoardAs(agent);
    const lampu = board.categories.find((category) => category.name === 'Lampu Jalan');
    const lainnya = board.categories.find((category) => category.name === 'Lainnya');

    const renamed = await agent
      .patch(`/api/boards/${board.slug}/categories/${lampu.id}`)
      .send({ name: 'Penerangan Jalan', sortOrder: 9 });
    const protectedRename = await agent
      .patch(`/api/boards/${board.slug}/categories/${lainnya.id}`)
      .send({ name: 'Lain-lain' });
    const clash = await agent
      .patch(`/api/boards/${board.slug}/categories/${lampu.id}`)
      .send({ name: 'Pohon Tumbang' });

    expect(renamed.body.data).toMatchObject({ name: 'Penerangan Jalan', sortOrder: 9 });
    expect(protectedRename.status).toBe(409);
    expect(protectedRename.body.error.code).toBe('CATEGORY_PROTECTED');
    expect(clash.status).toBe(409);
  });

  it('menghapus kategori, tetapi kategori terakhir ("Lainnya") tidak bisa dihapus', async () => {
    const { agent } = await loginAs('budi@example.com');
    const board = await createBoardAs(agent);
    const removable = board.categories.filter((category) => category.name !== 'Lainnya');
    const lainnya = board.categories.find((category) => category.name === 'Lainnya');

    for (const category of removable) {
      const res = await agent.delete(`/api/boards/${board.slug}/categories/${category.id}`);
      expect(res.body.data).toEqual({ id: category.id, deleted: true });
    }
    const last = await agent.delete(`/api/boards/${board.slug}/categories/${lainnya.id}`);

    expect(last.status).toBe(409);
    expect(last.body.error.code).toBe('CATEGORY_PROTECTED');
    expect(await prisma.category.count({ where: { boardId: board.id } })).toBe(1);
  });

  it('membalas 404 untuk kategori milik Board lain', async () => {
    const { agent } = await loginAs('budi@example.com');
    const first = await createBoardAs(agent);
    const second = await createBoardAs(agent, { name: 'Board Kedua' });

    const res = await agent.delete(
      `/api/boards/${first.slug}/categories/${second.categories[0].id}`,
    );

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('mengurutkan ulang semua kategori', async () => {
    const { agent } = await loginAs('budi@example.com');
    const board = await createBoardAs(agent);
    const reversed = board.categories.map((category) => category.id).reverse();

    const res = await agent
      .put(`/api/boards/${board.slug}/categories/order`)
      .send({ categoryIds: reversed });
    const partial = await agent
      .put(`/api/boards/${board.slug}/categories/order`)
      .send({ categoryIds: reversed.slice(1) });
    const duplicate = await agent
      .put(`/api/boards/${board.slug}/categories/order`)
      .send({ categoryIds: [reversed[0], reversed[0]] });

    expect(res.status).toBe(200);
    expect(res.body.data.map((category) => category.id)).toEqual(reversed);
    expect(partial.status).toBe(400);
    expect(duplicate.status).toBe(400);
  });

  it('menolak pengelolaan kategori oleh bukan OWNER', async () => {
    const owner = await loginAs('budi@example.com');
    const other = await loginAs('siti@example.com');
    const board = await createBoardAs(owner.agent);

    const res = await other.agent
      .post(`/api/boards/${board.slug}/categories`)
      .send({ name: 'Parkir Liar' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/me/boards', () => {
  it('mengembalikan Board tempat user OWNER atau HANDLER ACTIVE', async () => {
    const owner = await loginAs('budi@example.com');
    const handler = await loginAs('siti@example.com');
    const board = await createBoardAs(owner.agent);
    const otherBoard = await createBoardAs(handler.agent, { name: 'Alun Alun Kota' });
    await prisma.boardMember.create({
      data: { boardId: board.id, userId: handler.user.id, role: 'HANDLER', status: 'ACTIVE' },
    });

    const res = await handler.agent.get('/api/me/boards');

    expect(res.status).toBe(200);
    expect(res.body.data.map((item) => [item.board.slug, item.role])).toEqual([
      [otherBoard.slug, 'OWNER'],
      [board.slug, 'HANDLER'],
    ]);
    expect((await request(app).get('/api/me/boards')).status).toBe(401);
  });

  it('tidak menyertakan undangan yang belum diterima', async () => {
    const owner = await loginAs('budi@example.com');
    const invited = await loginAs('siti@example.com');
    const board = await createBoardAs(owner.agent);
    await prisma.boardMember.create({
      data: { boardId: board.id, userId: invited.user.id, role: 'HANDLER', status: 'INVITED' },
    });

    const res = await invited.agent.get('/api/me/boards');

    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/meta/cities', () => {
  it('mengembalikan semua kota tanpa q', async () => {
    const res = await request(app).get('/api/meta/cities');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(514);
    expect(res.body.data).toContainEqual({ name: 'Kota Surabaya', province: 'Jawa Timur' });
  });

  it('mengembalikan maksimal 20 kota yang cocok dengan q', async () => {
    const surabaya = await request(app).get('/api/meta/cities?q=surabaya');
    const kabupaten = await request(app).get('/api/meta/cities?q=kabupaten');

    expect(surabaya.body.data).toEqual([{ name: 'Kota Surabaya', province: 'Jawa Timur' }]);
    expect(kabupaten.body.data).toHaveLength(20);
  });
});
