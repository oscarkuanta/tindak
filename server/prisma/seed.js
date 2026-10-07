import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { prisma } from '../src/lib/prisma.js';
import { logger } from '../src/lib/logger.js';
import { BCRYPT_COST } from '../src/modules/auth/auth.service.js';
import { createBoard } from '../src/modules/boards/boards.service.js';
import { boardBaseSlug } from '../src/utils/slugify.js';
import { normalizeImage } from '../src/lib/images.js';
import { saveFile } from '../src/lib/storage.js';
import { hashIp, sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { refreshReportScores } from '../src/modules/engagement/scores.service.js';
import { recomputeAllBoardTrust } from '../src/modules/trust/trust.service.js';

const DEMO_TRACKING = { code: 'DEMAK234', secret: 'rahasia-demo-tindak' };

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
      await prisma.boardVerificationLog.create({
        data: {
          boardId: board.id,
          action: 'GRANTED',
          actorUserId: users.boardAdmin.id,
          reason: 'Data demo: Board sekolah resmi',
          snapshot: { ratingCount: 0, trustScore: null, responseRate: null, rejectedRate: 0 },
        },
      });
    }
  }
  return created;
}

const MEMBERSHIPS = [
  { board: ['SMKN 1 Surabaya', 'Kota Surabaya'], user: 'siti', status: 'ACTIVE' },
  { board: ['Perumahan Pondok Jati RW 05', 'Kabupaten Sidoarjo'], user: 'budi', status: 'INVITED' },
];

const FOLLOWS = [
  { board: ['Jalan Rungkut Madya', 'Kota Surabaya'], user: 'siti', notifyLevel: 'ALL' },
  {
    board: ['Alun-Alun Sidoarjo', 'Kabupaten Sidoarjo'],
    user: 'siti',
    notifyLevel: 'DANGEROUS_ONLY',
  },
  { board: ['Kampus ITS Sukolilo', 'Kota Surabaya'], user: 'budi', notifyLevel: 'ALL' },
  { board: ['SMKN 1 Surabaya', 'Kota Surabaya'], user: 'admin', notifyLevel: 'ALL' },
  { board: ['Jalan Rungkut Madya', 'Kota Surabaya'], user: 'boardAdmin', notifyLevel: 'OFF' },
];

async function boardIdFor([name, city]) {
  const board = await prisma.board.findUnique({ where: { slug: boardBaseSlug(name, city) } });
  return board.id;
}

async function seedMembersAndFollows(users) {
  for (const { board, user, status } of MEMBERSHIPS) {
    const boardId = await boardIdFor(board);
    const userId = users[user].id;
    const owner = await prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });
    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId } },
      create: { boardId, userId, role: 'HANDLER', status, invitedById: owner.ownerId },
      update: {},
    });
  }
  for (const { board, user, notifyLevel } of FOLLOWS) {
    const boardId = await boardIdFor(board);
    const userId = users[user].id;
    await prisma.boardFollower.upsert({
      where: { boardId_userId: { boardId, userId } },
      create: { boardId, userId, notifyLevel },
      update: {},
    });
  }
}

const REPORTS = [
  {
    board: ['Jalan Rungkut Madya', 'Kota Surabaya'],
    category: 'Jalan Berlubang',
    reporter: null,
    demo: true,
    severity: 'DANGEROUS',
    title: 'Lubang besar di depan Indomaret',
    locationDetail: 'Depan Indomaret Rungkut Madya, lajur kiri',
    description: 'Lubang selebar satu meter dan cukup dalam. Dua motor sudah jatuh minggu ini.',
    color: '#7c5a3a',
  },
  {
    board: ['Jalan Rungkut Madya', 'Kota Surabaya'],
    category: 'Lampu Jalan',
    reporter: 'siti',
    severity: 'MEDIUM',
    title: 'Tiga lampu jalan mati berturut-turut',
    locationDetail: 'Dekat pertigaan Rungkut Madya Gang 5',
    description:
      'Sudah gelap total sejak seminggu lalu, rawan kecelakaan dan pencurian malam hari.',
    color: '#2f3640',
  },
  {
    board: ['Jalan Rungkut Madya', 'Kota Surabaya'],
    category: 'Drainase dan Banjir',
    reporter: 'siti',
    anonymous: true,
    severity: 'LOW',
    title: 'Selokan tersumbat sampah plastik',
    locationDetail: 'Samping warung kopi Pak Kus',
    description: 'Air menggenang setiap hujan karena saluran tertutup sampah plastik dan daun.',
    color: '#3d6b4f',
  },
  {
    board: ['SMKN 1 Surabaya', 'Kota Surabaya'],
    category: 'Air dan Sanitasi',
    reporter: 'boardAdmin',
    severity: 'MEDIUM',
    title: 'Keran toilet putra lantai 2 bocor',
    locationDetail: 'Gedung B lantai 2, toilet putra',
    description:
      'Keran wastafel tidak bisa ditutup rapat sehingga air terus mengalir sepanjang hari.',
    color: '#4a7fa7',
  },
  {
    board: ['Alun-Alun Sidoarjo', 'Kabupaten Sidoarjo'],
    category: 'Fasilitas Rusak',
    reporter: null,
    severity: 'DANGEROUS',
    title: 'Pagar besi taman roboh dan tajam',
    locationDetail: 'Sisi utara alun-alun dekat area bermain anak',
    description:
      'Pagar besi roboh dengan ujung tajam mencuat, berbahaya untuk anak-anak yang bermain.',
    color: '#8a3b3b',
  },
];

const SMKN = ['SMKN 1 Surabaya', 'Kota Surabaya'];

const WORKFLOW_REPORTS = [
  {
    board: SMKN,
    category: 'Kebersihan',
    reporter: 'admin',
    severity: 'LOW',
    title: 'Tempat sampah kantin penuh sejak kemarin',
    locationDetail: 'Kantin belakang gedung A',
    description: 'Tempat sampah kantin meluap sampai ke lantai dan mulai berbau.',
    color: '#6b7a3a',
    workflow: 'NEED_INFO',
  },
  {
    board: SMKN,
    category: 'Listrik',
    reporter: null,
    severity: 'DANGEROUS',
    title: 'Kabel stop kontak lab terkelupas',
    locationDetail: 'Lab komputer 2, meja paling belakang',
    description: 'Kabel stop kontak terkelupas dan sempat memercikkan api saat dipakai siswa.',
    color: '#3a3f6b',
    workflow: 'IN_PROGRESS',
    overdue: true,
  },
  {
    board: SMKN,
    category: 'Kerusakan Fasilitas',
    reporter: 'admin',
    severity: 'MEDIUM',
    title: 'Kursi kelas XI TKJ 2 banyak yang patah',
    locationDetail: 'Gedung C lantai 3, kelas XI TKJ 2',
    description: 'Sekitar lima kursi patah kakinya sehingga siswa harus berdiri saat pelajaran.',
    color: '#7a4e2d',
    workflow: 'AWAITING_CONFIRMATION',
  },
  {
    board: SMKN,
    category: 'Keamanan',
    reporter: 'boardAdmin',
    severity: 'MEDIUM',
    title: 'Lampu parkir motor mati',
    locationDetail: 'Parkiran motor siswa sisi timur',
    description: 'Lampu parkiran mati sehingga parkiran gelap total saat kegiatan sore.',
    color: '#2d5f7a',
    workflow: 'RESOLVED',
  },
  {
    board: SMKN,
    category: 'Lainnya',
    reporter: null,
    severity: 'LOW',
    title: 'Jadwal ujian belum diumumkan',
    locationDetail: 'Papan pengumuman lobi',
    description: 'Jadwal ujian semester belum ditempel di papan pengumuman lobi sekolah.',
    color: '#5a5a5a',
    workflow: 'REJECTED',
  },
];

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function applyWorkflow(reportId, item, users, createdAt) {
  const handler = users.siti.id;
  const owner = users.budi.id;
  const events = [];
  const data = {};

  if (item.workflow === 'NEED_INFO') {
    await prisma.infoRequest.create({
      data: {
        reportId,
        question: 'Tempat sampah yang mana? Ada tiga di kantin.',
        askedById: handler,
        createdAt: hoursAgo(2),
      },
    });
    events.push({
      fromStatus: 'NEW',
      toStatus: 'NEED_INFO',
      actorId: handler,
      note: 'Tempat sampah yang mana? Ada tiga di kantin.',
    });
  }
  if (['IN_PROGRESS', 'AWAITING_CONFIRMATION', 'RESOLVED'].includes(item.workflow)) {
    events.push({ fromStatus: 'NEW', toStatus: 'IN_PROGRESS', actorId: owner });
    data.assigneeId = handler;
  }
  if (['AWAITING_CONFIRMATION', 'RESOLVED'].includes(item.workflow)) {
    const after = await demoPhoto('#2f7a4a', `Sesudah: ${item.title}`);
    await prisma.reportMedia.create({
      data: { reportId, url: after.url, storageKey: after.key, kind: 'AFTER' },
    });
    events.push({
      fromStatus: 'IN_PROGRESS',
      toStatus: 'AWAITING_CONFIRMATION',
      actorId: handler,
      note: 'Sudah diperbaiki, mohon dicek.',
    });
  }
  if (item.workflow === 'RESOLVED') {
    events.push({
      fromStatus: 'AWAITING_CONFIRMATION',
      toStatus: 'RESOLVED',
      actorType: 'REPORTER',
      actorId: users[item.reporter]?.id ?? null,
      note: 'Sudah terang lagi, terima kasih.',
    });
    data.resolvedAt = hoursAgo(1);
  }
  if (item.workflow === 'REJECTED') {
    events.push({
      fromStatus: 'NEW',
      toStatus: 'REJECTED',
      actorId: owner,
      reason: 'NOT_PHYSICAL',
      note: 'Bukan masalah fisik, silakan tanyakan ke wali kelas.',
    });
  }
  if (item.overdue) {
    data.dueAt = hoursAgo(3);
  }

  let at = createdAt.getTime();
  for (const event of events) {
    at += 20 * 60 * 1000;
    await prisma.reportEvent.create({
      data: { reportId, actorType: 'HANDLER', ...event, createdAt: new Date(at) },
    });
  }
  await prisma.report.update({ where: { id: reportId }, data: { status: item.workflow, ...data } });
}

async function demoPhoto(color, title) {
  const svg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}"/><text x="60" y="720" font-family="Arial" font-size="48" fill="#ffffff">Foto contoh: ${title.replace(/[<>&]/g, '')}</text></svg>`;
  const buffer = await normalizeImage(await sharp(Buffer.from(svg)).jpeg().toBuffer());
  return saveFile(buffer, 'webp');
}

async function seedReports(users) {
  let created = 0;
  const ipHash = hashIp('seed');
  for (const item of [...REPORTS, ...WORKFLOW_REPORTS]) {
    const board = await prisma.board.findUnique({ where: { slug: boardBaseSlug(...item.board) } });
    const exists = await prisma.report.findFirst({
      where: { boardId: board.id, title: item.title },
    });
    if (exists) continue;
    const category = await prisma.category.findFirst({
      where: { boardId: board.id, name: item.category },
    });
    const user = item.reporter ? users[item.reporter] : null;
    const photo = await demoPhoto(item.color, item.title);
    const now = item.workflow ? hoursAgo(30) : hoursAgo(REPORTS.length - created);
    const report = await prisma.report.create({
      data: {
        boardId: board.id,
        categoryId: category.id,
        userId: user?.id ?? null,
        isAnonymous: !user || Boolean(item.anonymous),
        guestTokenHash: user ? null : sha256(`seed-${item.title}`),
        ipHash,
        title: item.title,
        description: item.description,
        locationDetail: item.locationDetail,
        severity: item.severity,
        trackingCode: item.demo ? DEMO_TRACKING.code : generateTrackingCode(),
        trackingSecretHash: sha256(item.demo ? DEMO_TRACKING.secret : `seed-${item.title}`),
        dueAt:
          item.severity === 'DANGEROUS'
            ? new Date(now.getTime() + board.dangerousTargetHours * 60 * 60 * 1000)
            : null,
        createdAt: now,
        media: { create: { url: photo.url, storageKey: photo.key, kind: 'BEFORE' } },
        events: {
          create: {
            toStatus: 'NEW',
            actorType: 'REPORTER',
            actorId: user?.id ?? null,
            note: 'Laporan dibuat',
            createdAt: now,
          },
        },
      },
    });
    if (item.workflow) await applyWorkflow(report.id, item, users, now);
    created += 1;
  }
  return created;
}

const ENGAGEMENTS = [
  {
    title: 'Lubang besar di depan Indomaret',
    supporters: ['siti', 'admin', 'boardAdmin'],
    reactions: { siti: 'DANGEROUS', admin: 'DANGEROUS', budi: 'LONG_STANDING' },
  },
  {
    title: 'Tiga lampu jalan mati berturut-turut',
    supporters: ['admin', 'boardAdmin'],
    reactions: { admin: 'ANNOYING' },
  },
  {
    title: 'Pagar besi taman roboh dan tajam',
    supporters: ['siti'],
    reactions: { siti: 'DANGEROUS' },
  },
  {
    title: 'Kabel stop kontak lab terkelupas',
    supporters: ['boardAdmin'],
    reactions: { boardAdmin: 'DANGEROUS' },
  },
];

async function seedEngagement(users) {
  for (const item of ENGAGEMENTS) {
    const report = await prisma.report.findFirst({ where: { title: item.title } });
    if (!report) continue;
    for (const key of item.supporters) {
      if (report.userId === users[key].id) continue;
      await prisma.support.upsert({
        where: { reportId_userId: { reportId: report.id, userId: users[key].id } },
        create: { reportId: report.id, userId: users[key].id },
        update: {},
      });
    }
    for (const [key, type] of Object.entries(item.reactions)) {
      await prisma.reaction.upsert({
        where: { reportId_userId: { reportId: report.id, userId: users[key].id } },
        create: { reportId: report.id, userId: users[key].id, type },
        update: {},
      });
    }
    await prisma.report.update({
      where: { id: report.id },
      data: { lastEngagementAt: new Date() },
    });
  }
  const reports = await prisma.report.findMany({ select: { id: true } });
  for (const report of reports) await refreshReportScores(prisma, report.id);
}

const RATING_DEMO = [
  {
    board: ['Kampus ITS Sukolilo', 'Kota Surabaya'],
    ageDays: 40,
    stars: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4],
    quickTag: 'RESPONSIVE',
  },
  {
    board: ['SMKN 1 Surabaya', 'Kota Surabaya'],
    stars: [5, 5, 4, 4, 5, 4, 5, 3],
    quickTag: 'RESPONSIVE',
  },
  {
    board: ['Alun-Alun Sidoarjo', 'Kabupaten Sidoarjo'],
    stars: [1, 2, 1, 2, 1, 2],
    quickTag: 'SLOW',
  },
];

async function seedRaters(count) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);
  const raters = [];
  for (let index = 1; index <= count; index += 1) {
    const number = String(index).padStart(2, '0');
    raters.push(
      await prisma.user.upsert({
        where: { email: `warga${number}@tindak.test` },
        create: {
          name: `Warga Demo ${number}`,
          email: `warga${number}@tindak.test`,
          passwordHash,
          onboardedAt: new Date(),
        },
        update: {},
      }),
    );
  }
  return raters;
}

async function seedRatings() {
  const raters = await seedRaters(Math.max(...RATING_DEMO.map((item) => item.stars.length)));
  for (const item of RATING_DEMO) {
    const boardId = await boardIdFor(item.board);
    if (item.ageDays) {
      await prisma.board.update({
        where: { id: boardId },
        data: { createdAt: new Date(Date.now() - item.ageDays * 24 * 60 * 60 * 1000) },
      });
    }
    for (const [index, stars] of item.stars.entries()) {
      const userId = raters[index].id;
      await prisma.boardFollower.upsert({
        where: { boardId_userId: { boardId, userId } },
        create: { boardId, userId },
        update: {},
      });
      await prisma.boardRating.upsert({
        where: { boardId_userId: { boardId, userId } },
        create: { boardId, userId, stars, quickTag: index % 3 === 0 ? item.quickTag : null },
        update: {},
      });
    }
  }
  return recomputeAllBoardTrust();
}

async function main() {
  const users = await seedUsers();
  const created = await seedBoards(users);
  await seedMembersAndFollows(users);
  const reports = await seedReports(users);
  await seedEngagement(users);
  await seedRatings();
  logger.info(
    `Seed selesai: ${USERS.length} akun disiapkan, ${created} Board baru dari ${BOARDS.length}, ${reports} laporan baru dari ${REPORTS.length + WORKFLOW_REPORTS.length}`,
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
