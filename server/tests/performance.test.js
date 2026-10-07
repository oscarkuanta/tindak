import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
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

async function questions() {
  const [row] = await prisma.$queryRaw`SHOW GLOBAL STATUS LIKE 'Questions'`;
  return Number(row.Value);
}

async function seedReports(count) {
  const owner = await createUser({ email: `owner${count}@example.com` });
  const board = await prisma.board.create({
    data: {
      slug: `board-${count}`,
      name: `Board ${count}`,
      city: 'Kota Surabaya',
      type: 'ROAD',
      description: 'Deskripsi Board uji yang cukup panjang.',
      ownerId: owner.id,
      categories: { create: [{ name: 'Lainnya', isDefault: true }] },
    },
    include: { categories: true },
  });
  for (let index = 0; index < count; index += 1) {
    const report = await prisma.report.create({
      data: {
        boardId: board.id,
        categoryId: board.categories[0].id,
        userId: owner.id,
        title: `Laporan ${index}`,
        description: 'Deskripsi laporan uji yang cukup panjang.',
        locationDetail: 'Lokasi',
        severity: 'LOW',
        trackingCode: generateTrackingCode(),
        trackingSecretHash: sha256('x'),
        hotScore: index,
      },
    });
    await prisma.reportMedia.create({
      data: { reportId: report.id, url: `/api/uploads/${index}.webp`, storageKey: `${index}.webp` },
    });
  }
  return { owner, board };
}

async function measure(agent, path) {
  await agent.get(path).expect(200);
  const before = await questions();
  await agent.get(path).expect(200);
  return (await questions()) - before - 1;
}

describe('Query feed tanpa N+1', () => {
  it('jumlah query feed dan daftar Board tetap walau jumlah laporan naik', async () => {
    const viewer = await createUser({ email: 'viewer@example.com' });
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: viewer.email, password: 'rahasia123' })
      .expect(200);

    const small = await seedReports(3);
    const feedSmall = await measure(agent, '/api/feed/home?pageSize=20');
    const boardSmall = await measure(agent, `/api/boards/${small.board.slug}/reports?pageSize=20`);
    await resetDatabase();
    await createUser({ email: 'viewer@example.com' });
    await agent
      .post('/api/auth/login')
      .send({ email: 'viewer@example.com', password: 'rahasia123' })
      .expect(200);
    const large = await seedReports(20);
    const feedLarge = await measure(agent, '/api/feed/home?pageSize=20');
    const boardLarge = await measure(agent, `/api/boards/${large.board.slug}/reports?pageSize=20`);

    expect(feedLarge).toBe(feedSmall);
    expect(boardLarge).toBe(boardSmall);
    expect(feedLarge).toBeLessThan(15);
  });
});

describe('Index database', () => {
  async function explainKeys(query) {
    const rows = await query;
    return rows.map((row) => row.key).filter(Boolean);
  }

  it('feed beranda, feed Board, antrean, dan pencarian memakai index', async () => {
    const hot = await explainKeys(
      prisma.$queryRaw`EXPLAIN SELECT id FROM reports WHERE is_hidden = 0 ORDER BY hot_score DESC LIMIT 20`,
    );
    const boardFeed = await explainKeys(
      prisma.$queryRaw`EXPLAIN SELECT id FROM reports WHERE board_id = 1 AND is_hidden = 0 ORDER BY priority_score DESC LIMIT 20`,
    );
    const queue = await explainKeys(
      prisma.$queryRaw`EXPLAIN SELECT id FROM reports WHERE board_id = 1 AND status = 'NEW'`,
    );
    const search = await explainKeys(
      prisma.$queryRaw`EXPLAIN SELECT id FROM boards WHERE city = 'Kota Surabaya' AND type = 'ROAD'`,
    );
    const notifications = await explainKeys(
      prisma.$queryRaw`EXPLAIN SELECT id FROM notifications WHERE user_id = 1 AND read_at IS NULL`,
    );

    expect(hot.join()).toMatch(/hot_score/);
    expect(boardFeed.join()).toMatch(/priority_score/);
    expect(queue.join()).toMatch(/board_id/);
    expect(search.join()).toMatch(/city/);
    expect(notifications.join()).toMatch(/user_id/);
  });
});
