import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { logger } from '../src/lib/logger.js';
import { BCRYPT_COST } from '../src/modules/auth/auth.service.js';
import { createBoard } from '../src/modules/boards/boards.service.js';
import { boardBaseSlug } from '../src/utils/slugify.js';

const SEED_PASSWORD = 'tindak123';

const USERS = [
  { key: 'admin', name: 'Admin Moderator', email: 'admin@tindak.test', role: 'ADMIN' },
  { key: 'boardAdmin', name: 'Admin Board', email: 'boardadmin@tindak.test', role: 'BOARD_ADMIN' },
  { key: 'budi', name: 'Budi Santoso', email: 'budi@tindak.test', role: 'USER' },
  { key: 'siti', name: 'Siti Aminah', email: 'siti@tindak.test', role: 'USER' },
];

const BOARDS = [
  {
    owner: 'budi',
    official: true,
    name: 'SMKN 1 Surabaya',
    city: 'Kota Surabaya',
    type: 'SCHOOL',
    managerTitle: 'Wakasek Sarpras',
    description:
      'Laporan kerusakan fasilitas, kebersihan, dan keamanan di lingkungan SMKN 1 Surabaya.',
  },
  {
    owner: 'budi',
    name: 'Jalan Rungkut Madya',
    city: 'Kota Surabaya',
    type: 'ROAD',
    managerTitle: 'Ketua RT 05',
    description:
      'Laporan jalan berlubang, lampu jalan mati, dan drainase di sepanjang Jalan Rungkut Madya.',
    extraCategories: ['Parkir Liar'],
  },
  {
    owner: 'siti',
    name: 'Kampus ITS Sukolilo',
    city: 'Kota Surabaya',
    type: 'CAMPUS',
    description: 'Laporan fasilitas kampus ITS Sukolilo yang rusak atau perlu perhatian pengelola.',
  },
  {
    owner: 'siti',
    name: 'Perumahan Pondok Jati RW 05',
    city: 'Kabupaten Sidoarjo',
    type: 'AREA',
    managerTitle: 'Ketua RW 05',
    description: 'Laporan sampah, penerangan, dan fasilitas umum di lingkungan RW 05 Pondok Jati.',
  },
  {
    owner: 'budi',
    name: 'Alun-Alun Sidoarjo',
    city: 'Kabupaten Sidoarjo',
    type: 'PUBLIC_FACILITY',
    description: 'Laporan kebersihan dan kerusakan fasilitas umum di kawasan Alun-Alun Sidoarjo.',
  },
];

async function seedUsers() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);
  const users = {};
  for (const { key, name, email, role } of USERS) {
    users[key] = await prisma.user.upsert({
      where: { email },
      create: { name, email, role, passwordHash, onboardedAt: new Date() },
      update: { name, role, passwordHash },
    });
  }
  return users;
}

async function seedBoards(users) {
  let created = 0;
  for (const { owner, official, extraCategories = [], ...input } of BOARDS) {
    const slug = boardBaseSlug(input.name, input.city);
    let board = await prisma.board.findUnique({ where: { slug } });
    if (!board) {
      await createBoard(users[owner], { ...input, extraCategories, dangerousTargetHours: 48 });
      board = await prisma.board.findUnique({ where: { slug } });
      created += 1;
    }
    if (official && board.verification !== 'OFFICIAL') {
      await prisma.board.update({
        where: { id: board.id },
        data: {
          verification: 'OFFICIAL',
          verifiedAt: new Date(),
          verifiedById: users.boardAdmin.id,
        },
      });
    }
  }
  return created;
}

async function main() {
  const users = await seedUsers();
  const created = await seedBoards(users);
  logger.info(
    `Seed selesai: ${USERS.length} akun disiapkan, ${created} Board baru dari ${BOARDS.length}`,
  );
}

try {
  await main();
} catch (error) {
  logger.error({ err: error }, 'Seed gagal');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
