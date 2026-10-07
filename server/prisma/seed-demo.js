import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { logger } from '../src/lib/logger.js';
import { BCRYPT_COST } from '../src/modules/auth/auth.service.js';
import { createBoard } from '../src/modules/boards/boards.service.js';
import { normalizeImage } from '../src/lib/images.js';
import { saveFile } from '../src/lib/storage.js';
import { sha256 } from '../src/utils/crypto.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { refreshReportScores } from '../src/modules/engagement/scores.service.js';
import { recomputeAllBoardTrust, trustSnapshot } from '../src/modules/trust/trust.service.js';

export const DEMO_PASSWORD = 'demo1234';
export const DEMO_TRACKING = { code: 'TRACK234', secret: 'demo-lacak-tindak' };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.now();
const at = (daysAgo, plusHours = 0) => new Date(NOW - daysAgo * DAY + plusHours * HOUR);

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = random(2026);
const pick = (items) => items[Math.floor(rand() * items.length)];
const sample = (items, count) => [...items].sort(() => rand() - 0.5).slice(0, count);

const STAFF = [
  { key: 'admin', name: 'Rina Moderator', email: 'admin@demo.test', role: 'ADMIN' },
  {
    key: 'verifier',
    name: 'Dimas Verifikator',
    email: 'adminboard@demo.test',
    role: 'BOARD_ADMIN',
  },
  { key: 'hadi', name: 'Pak Hadi Santoso', email: 'hadi@demo.test' },
  { key: 'ratna', name: 'Bu Ratna Dewi', email: 'ratna@demo.test' },
  { key: 'yoga', name: 'Yoga Pratama', email: 'yoga@demo.test' },
  { key: 'andi', name: 'Andi Wijaya', email: 'andi@demo.test' },
  { key: 'dewi', name: 'Dewi Lestari', email: 'dewi@demo.test' },
  { key: 'sari', name: 'Sari Rahmawati', email: 'sari@demo.test' },
  { key: 'bayu', name: 'Bayu Saputra', email: 'bayu@demo.test' },
  { key: 'nanda', name: 'Nanda Putri', email: 'nanda@demo.test' },
  { key: 'joko', name: 'Joko Susilo', email: 'joko@demo.test' },
  { key: 'maya', name: 'Maya Anggraini', email: 'maya@demo.test' },
  { key: 'siti', name: 'Siti Aminah', email: 'siti@demo.test' },
  { key: 'rudi', name: 'Rudi Hartono', email: 'rudi@demo.test' },
  { key: 'nakal', name: 'Akun Spam', email: 'spam@demo.test' },
];

const WARGA_COUNT = 30;

const BOARDS = [
  {
    key: 'sman5',
    owner: 'hadi',
    handlers: ['joko'],
    name: 'SMAN 5 Surabaya',
    city: 'Kota Surabaya',
    type: 'SCHOOL',
    managerTitle: 'Wakasek Sarana Prasarana',
    description:
      'Laporan kerusakan fasilitas, kebersihan, listrik, dan keamanan di lingkungan SMAN 5 Surabaya.',
    ageDays: 120,
    verification: {
      grantedDaysAgo: 40,
      note: 'Dikelola Wakasek Sarpras, rating tinggi dan tanggap.',
    },
    stars: [
      5, 5, 5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5,
    ],
    quality: 'great',
  },
  {
    key: 'ayani',
    owner: 'ratna',
    handlers: ['maya'],
    name: 'Jalan Ahmad Yani Surabaya',
    city: 'Kota Surabaya',
    type: 'ROAD',
    managerTitle: 'Kepala Seksi Pemeliharaan Jalan',
    description:
      'Kanal resmi laporan jalan berlubang, lampu jalan, drainase, dan rambu di sepanjang Jalan Ahmad Yani.',
    ageDays: 110,
    verification: {
      grantedDaysAgo: 25,
      note: 'Pengelola dari seksi pemeliharaan jalan, respons cepat.',
    },
    stars: [5, 4, 5, 4, 5, 5, 4, 4, 5, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 5, 4],
    quality: 'great',
  },
  {
    key: 'ayaniPalsu',
    owner: 'yoga',
    handlers: [],
    name: 'Jl. A. Yani Surabaya',
    city: 'Kota Surabaya',
    type: 'ROAD',
    managerTitle: null,
    description:
      'Board warga untuk laporan Jalan A. Yani. Dikelola sukarela, belum ada kerja sama dengan pihak resmi.',
    ageDays: 70,
    stars: [1, 1, 2, 1, 1, 2, 1, 1, 2],
    quality: 'poor',
    fakeFlags: 2,
  },
  {
    key: 'its',
    owner: 'andi',
    handlers: ['bayu'],
    name: 'Kampus ITS Sukolilo',
    city: 'Kota Surabaya',
    type: 'CAMPUS',
    managerTitle: 'Relawan BEM Kampus',
    description: 'Laporan fasilitas kampus ITS Sukolilo yang rusak atau perlu perhatian pengelola.',
    ageDays: 55,
    stars: [5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5],
    quality: 'great',
  },
  {
    key: 'pondokjati',
    owner: 'dewi',
    handlers: ['nanda'],
    name: 'Perumahan Pondok Jati RW 03',
    city: 'Kabupaten Sidoarjo',
    type: 'AREA',
    managerTitle: 'Ketua RW 03',
    description:
      'Laporan sampah, drainase, penerangan, dan fasilitas umum di lingkungan RW 03 Pondok Jati.',
    ageDays: 45,
    stars: [5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5],
    quality: 'great',
  },
  {
    key: 'gubeng',
    owner: 'sari',
    handlers: [],
    name: 'Kantor Kelurahan Gubeng',
    city: 'Kota Surabaya',
    type: 'OFFICE',
    managerTitle: 'Sekretaris Kelurahan',
    description: 'Laporan fasilitas pelayanan publik di Kantor Kelurahan Gubeng.',
    ageDays: 35,
    stars: [5, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 5],
    quality: 'great',
  },
  {
    key: 'alunalun',
    owner: 'bayu',
    handlers: [],
    name: 'Alun-Alun Sidoarjo',
    city: 'Kabupaten Sidoarjo',
    type: 'PUBLIC_FACILITY',
    managerTitle: 'Relawan Peduli Alun-Alun',
    description: 'Laporan kebersihan dan kerusakan fasilitas umum di kawasan Alun-Alun Sidoarjo.',
    ageDays: 100,
    verification: {
      grantedDaysAgo: 70,
      note: 'Pengelola mengaku pengurus resmi alun-alun.',
      revokedDaysAgo: 18,
      reason: 'Pengelola tidak lagi menjadi pengurus resmi dan banyak laporan tidak ditanggapi.',
    },
    stars: [3, 4, 3, 2, 4, 3, 3, 4, 2, 3, 4, 3, 3, 2],
    quality: 'average',
  },
  {
    key: 'bungkul',
    owner: 'nanda',
    handlers: [],
    name: 'Taman Bungkul Surabaya',
    city: 'Kota Surabaya',
    type: 'PUBLIC_FACILITY',
    managerTitle: null,
    description: 'Board baru untuk laporan kebersihan dan fasilitas di Taman Bungkul.',
    ageDays: 4,
    stars: [5, 4],
    quality: 'new',
  },
];

const TEMPLATES = {
  SCHOOL: [
    [
      'Kerusakan Fasilitas',
      'Kursi kelas XI-3 patah',
      'Ruang XI-3 lantai 2',
      'fasilitas-sekolah-rusak',
    ],
    ['Air dan Sanitasi', 'Toilet siswa putra bocor', 'Toilet dekat kantin', 'toilet-rusak'],
    ['Listrik', 'Lampu koridor lantai 3 mati', 'Koridor lantai 3', 'lampu-mati'],
    ['Kebersihan', 'Sampah menumpuk di belakang kantin', 'Belakang kantin', 'sampah-menumpuk'],
    ['Keamanan', 'Pagar belakang sekolah jebol', 'Pagar sisi lapangan', 'pagar-rusak'],
  ],
  CAMPUS: [
    [
      'Kerusakan Fasilitas',
      'Meja ruang kuliah goyang',
      'Gedung Riset Lt. 4',
      'fasilitas-sekolah-rusak',
    ],
    ['Air dan Sanitasi', 'Wastafel toilet tersumbat', 'Toilet Perpustakaan Pusat', 'toilet-rusak'],
    ['Listrik', 'Lampu parkiran motor mati', 'Parkiran Teknik Informatika', 'lampu-mati'],
    ['Kebersihan', 'Sampah berserakan dekat danau', 'Danau 8', 'sampah-menumpuk'],
    ['Keamanan', 'Pohon tumbang menutup jalan kampus', 'Jalan Teknik Kimia', 'pohon-tumbang'],
  ],
  OFFICE: [
    [
      'Kerusakan Fasilitas',
      'Kursi ruang tunggu rusak',
      'Ruang tunggu pelayanan',
      'fasilitas-sekolah-rusak',
    ],
    ['Air dan Sanitasi', 'Toilet umum tidak ada air', 'Toilet pengunjung', 'toilet-rusak'],
    ['Listrik', 'Lampu loket pelayanan mati', 'Loket 2', 'lampu-mati'],
  ],
  ROAD: [
    ['Jalan Berlubang', 'Lubang besar di lajur kiri', 'Depan Royal Plaza', 'jalan-berlubang'],
    ['Lampu Jalan', 'Lampu PJU mati sepanjang 200 meter', 'Dekat Frontage Road', 'lampu-mati'],
    [
      'Drainase dan Banjir',
      'Saluran air tersumbat sampah',
      'Depan Gedung Bank',
      'drainase-tersumbat',
    ],
    [
      'Pohon Tumbang',
      'Pohon tumbang menutup separuh jalan',
      'Dekat Taman Pelangi',
      'pohon-tumbang',
    ],
    ['Jalan Berlubang', 'Aspal mengelupas dan berlubang', 'Bundaran Dolog', 'jalan-berlubang'],
  ],
  AREA: [
    ['Sampah', 'Sampah tidak diangkut tiga hari', 'Gang 5 RT 02', 'sampah-menumpuk'],
    ['Drainase', 'Selokan mampet saat hujan', 'Jalan Melati RT 04', 'drainase-tersumbat'],
    ['Penerangan', 'Lampu jalan gang mati', 'Gang 3 RT 01', 'lampu-mati'],
    ['Fasilitas Rusak', 'Pagar taman bermain rusak', 'Taman RW 03', 'pagar-rusak'],
  ],
  PUBLIC_FACILITY: [
    ['Sampah', 'Tempat sampah penuh dan berserakan', 'Sisi utara', 'sampah-menumpuk'],
    ['Penerangan', 'Lampu taman mati', 'Area air mancur', 'lampu-mati'],
    ['Fasilitas Rusak', 'Pagar pembatas roboh', 'Sisi timur', 'pagar-rusak'],
    ['Drainase', 'Genangan air tidak surut', 'Area parkir', 'drainase-tersumbat'],
  ],
};

const SCENARIOS = {
  great: [
    'RESOLVED',
    'RESOLVED',
    'RESOLVED',
    'RESOLVED',
    'AWAITING_CONFIRMATION',
    'IN_PROGRESS',
    'IN_PROGRESS',
    'NEW_FRESH',
    'NEED_INFO',
    'REOPENED',
    'DUPLICATE',
    'REJECTED',
  ],
  average: [
    'RESOLVED',
    'IN_PROGRESS',
    'NEW_STALE',
    'NEW_STALE',
    'REJECTED',
    'AWAITING_CONFIRMATION',
    'NEW_FRESH',
    'OVERDUE',
  ],
  poor: [
    'NEW_STALE',
    'NEW_STALE',
    'NEW_STALE',
    'NEW_STALE',
    'REJECTED',
    'REJECTED',
    'REJECTED',
    'OVERDUE',
    'IN_PROGRESS',
    'NEW_FRESH',
  ],
  new: ['NEW_FRESH', 'NEW_FRESH', 'HIDDEN'],
};

const OPEN_SCENARIOS = new Set(['IN_PROGRESS', 'NEW_STALE', 'NEED_INFO', 'REOPENED']);

const REJECTIONS = [
  ['OUT_OF_SCOPE', 'Lokasi ini di luar wilayah pengelolaan Board.'],
  ['NOT_PHYSICAL', 'Bukan masalah fisik, silakan hubungi bagian layanan.'],
  ['INSUFFICIENT_INFORMATION', 'Lokasi tidak jelas dan pelapor tidak menjawab pertanyaan.'],
  ['FALSE_REPORT', 'Setelah dicek di lapangan, tidak ditemukan kerusakan.'],
];

const photoCache = new Map();

async function storePhoto(name) {
  if (!photoCache.has(name)) {
    const source = await readFile(new URL(`./demo-photos/${name}.jpg`, import.meta.url));
    photoCache.set(name, await normalizeImage(source));
  }
  return saveFile(photoCache.get(name), 'webp');
}

const AFTER_PHOTO = {
  'jalan-berlubang': 'jalan-diperbaiki',
  'sampah-menumpuk': 'sampah-bersih',
};

async function addPhoto(reportId, name, kind, createdAt) {
  const stored = await storePhoto(name);
  await prisma.reportMedia.create({
    data: { reportId, url: stored.url, storageKey: stored.key, kind, createdAt },
  });
}

async function assertSafeToSeed() {
  const reset = process.argv.includes('--reset');
  const users = await prisma.user.count();
  if (users > 0 && !reset) {
    throw new Error(
      'Database sudah berisi data. Jalankan dengan --reset hanya jika yakin semua data boleh dihapus.',
    );
  }
  if (!reset) return;
  for (const model of [
    'session',
    'notification',
    'auditLog',
    'ban',
    'flag',
    'boardVerificationLog',
    'boardRating',
    'reaction',
    'support',
    'infoRequest',
    'reportEvent',
    'reportMedia',
    'report',
    'boardFollower',
    'category',
    'boardMember',
    'board',
    'user',
  ]) {
    await prisma[model].deleteMany();
  }
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
  const users = {};
  for (const { key, name, email, role = 'USER' } of STAFF) {
    users[key] = await prisma.user.create({
      data: { name, email, role, passwordHash, onboardedAt: at(130), createdAt: at(130) },
    });
  }
  const warga = [];
  for (let index = 1; index <= WARGA_COUNT; index += 1) {
    const number = String(index).padStart(2, '0');
    warga.push(
      await prisma.user.create({
        data: {
          name: `Warga ${number}`,
          email: `warga${number}@demo.test`,
          passwordHash,
          onboardedAt: at(125),
          createdAt: at(125),
        },
      }),
    );
  }
  return { users, warga };
}

async function seedBoard(spec, users) {
  const created = await createBoard(users[spec.owner], {
    name: spec.name,
    city: spec.city,
    type: spec.type,
    managerTitle: spec.managerTitle ?? undefined,
    description: spec.description,
    dangerousTargetHours: 48,
    extraCategories: [],
  });
  await prisma.board.update({
    where: { id: created.id },
    data: { createdAt: at(spec.ageDays), lastHandlerActivityAt: at(0, -2) },
  });
  for (const handler of spec.handlers) {
    await prisma.boardMember.create({
      data: {
        boardId: created.id,
        userId: users[handler].id,
        role: 'HANDLER',
        status: 'ACTIVE',
        invitedById: users[spec.owner].id,
        createdAt: at(spec.ageDays - 2),
      },
    });
  }
  return prisma.board.findUnique({ where: { id: created.id }, include: { categories: true } });
}

function reporterFor(index, warga) {
  if (index % 5 === 0) {
    return {
      userId: null,
      isAnonymous: true,
      guestTokenHash: sha256(`demo-guest-${index}`),
      ipHash: sha256(`demo-ip-${index % 7}`),
    };
  }
  return {
    userId: warga[index % warga.length].id,
    isAnonymous: index % 4 === 0,
    guestTokenHash: null,
    ipHash: sha256(`demo-ip-${index % 11}`),
  };
}

function plan(scenario, daysAgo, quality) {
  switch (scenario) {
    case 'RESOLVED':
      return {
        status: 'RESOLVED',
        steps: [
          ['IN_PROGRESS', 3],
          ['AWAITING_CONFIRMATION', 30],
          ['RESOLVED', 40],
        ],
      };
    case 'AWAITING_CONFIRMATION':
      return {
        status: 'AWAITING_CONFIRMATION',
        steps: [
          ['IN_PROGRESS', 4],
          ['AWAITING_CONFIRMATION', 26],
        ],
      };
    case 'IN_PROGRESS':
      return { status: 'IN_PROGRESS', steps: [['IN_PROGRESS', 5]] };
    case 'NEED_INFO':
      return { status: 'NEED_INFO', steps: [['NEED_INFO', 6]] };
    case 'REOPENED':
      return {
        status: 'REOPENED',
        steps: [
          ['IN_PROGRESS', 2],
          ['AWAITING_CONFIRMATION', 20],
          ['REOPENED', 30],
        ],
      };
    case 'REJECTED':
      return {
        status: 'REJECTED',
        steps: [['REJECTED', quality === 'poor' ? 200 : daysAgo > 10 ? 30 : 8]],
      };
    case 'DUPLICATE':
      return { status: 'DUPLICATE', steps: [['DUPLICATE', 2]] };
    case 'OVERDUE':
      return { status: 'IN_PROGRESS', steps: [['IN_PROGRESS', 60]], dangerous: true };
    case 'HIDDEN':
      return { status: 'NEW', steps: [], hidden: true };
    case 'NEW_STALE':
      return { status: 'NEW', steps: [] };
    default:
      return { status: 'NEW', steps: [] };
  }
}

function daysFor(scenario, index, board) {
  const maxAge = Math.max(1, Math.min(60, board.ageDays - 1));
  if (scenario === 'NEW_FRESH') return Math.min(maxAge, 1 + (index % 3));
  if (scenario === 'NEW_STALE') return Math.min(maxAge, 12 + (index % 20));
  if (scenario === 'HIDDEN') return Math.min(maxAge, 2);
  return Math.min(maxAge, 4 + ((index * 7) % 55));
}

async function seedReports(spec, board, users, warga, counter) {
  const templates = TEMPLATES[spec.type];
  const scenarios = SCENARIOS[spec.quality];
  const handlerIds = [users[spec.owner].id, ...spec.handlers.map((key) => users[key].id)];
  const reports = [];
  let parent = null;

  for (const [position, scenario] of scenarios.entries()) {
    counter.value += 1;
    const index = counter.value;
    const [categoryName, title, location, photo] = templates[position % templates.length];
    const category =
      board.categories.find((item) => item.name === categoryName) ?? board.categories[0];
    const daysAgo = daysFor(scenario, index, spec);
    const createdAt = at(daysAgo, -(index % 9));
    const details = plan(scenario, daysAgo, spec.quality);
    const calm = OPEN_SCENARIOS.has(scenario);
    const severity = details.dangerous
      ? 'DANGEROUS'
      : pick(calm ? ['LOW', 'MEDIUM'] : ['LOW', 'MEDIUM', 'MEDIUM', 'DANGEROUS']);
    const reporter = reporterFor(index, warga);
    const isDemoTracking = spec.key === 'ayani' && scenario === 'IN_PROGRESS' && !counter.tracking;
    if (isDemoTracking) counter.tracking = true;

    const report = await prisma.report.create({
      data: {
        boardId: board.id,
        categoryId: category.id,
        ...reporter,
        ...(isDemoTracking && {
          userId: null,
          isAnonymous: true,
          guestTokenHash: sha256('demo-lacak'),
        }),
        title: scenario === 'DUPLICATE' && parent ? `${parent.title} (laporan ulang)` : title,
        description: `${title}. Mohon segera ditindaklanjuti karena mengganggu aktivitas warga sekitar ${location}.`,
        locationDetail: location,
        severity,
        trackingCode: isDemoTracking ? DEMO_TRACKING.code : generateTrackingCode(),
        trackingSecretHash: sha256(isDemoTracking ? DEMO_TRACKING.secret : `demo-${index}`),
        dueAt: severity === 'DANGEROUS' ? new Date(createdAt.getTime() + 48 * HOUR) : null,
        createdAt,
        isHidden: Boolean(details.hidden),
        hiddenReason: details.hidden ? 'FLAGS' : null,
      },
    });
    await addPhoto(report.id, photo, 'BEFORE', createdAt);
    await prisma.reportEvent.create({
      data: {
        reportId: report.id,
        fromStatus: null,
        toStatus: 'NEW',
        actorType: 'REPORTER',
        actorId: reporter.isAnonymous ? null : reporter.userId,
        note: 'Laporan dibuat',
        createdAt,
      },
    });

    let from = 'NEW';
    const extra = {};
    for (const [to, afterHours] of details.steps) {
      const eventAt = new Date(createdAt.getTime() + afterHours * HOUR);
      if (eventAt.getTime() > NOW) break;
      const handlerId = pick(handlerIds);
      const event = {
        reportId: report.id,
        fromStatus: from,
        toStatus: to,
        actorType: 'HANDLER',
        actorId: handlerId,
        createdAt: eventAt,
      };
      if (to === 'RESOLVED') {
        Object.assign(event, {
          actorType: 'REPORTER',
          actorId: reporter.userId,
          note: 'Sudah beres, terima kasih',
        });
        extra.resolvedAt = eventAt;
      }
      if (to === 'REOPENED') {
        Object.assign(event, {
          actorType: 'REPORTER',
          actorId: reporter.userId,
          note: 'Masih rusak di sisi kanan',
        });
        extra.reopenCount = 1;
      }
      if (to === 'AWAITING_CONFIRMATION') {
        event.note = 'Sudah diperbaiki, mohon dicek';
        await addPhoto(report.id, AFTER_PHOTO[photo] ?? photo, 'AFTER', eventAt);
      }
      if (to === 'IN_PROGRESS') extra.assigneeId = handlerId;
      if (to === 'NEED_INFO') {
        event.note = 'Bisa dijelaskan patokan lokasi yang lebih tepat?';
        await prisma.infoRequest.create({
          data: {
            reportId: report.id,
            question: event.note,
            askedById: handlerId,
            createdAt: eventAt,
          },
        });
      }
      if (to === 'REJECTED') {
        const [reason, note] = REJECTIONS[index % REJECTIONS.length];
        Object.assign(event, { reason, note });
      }
      if (to === 'DUPLICATE' && parent) {
        event.note = `Duplikat dari laporan #${parent.id}`;
        extra.parentId = parent.id;
      }
      await prisma.reportEvent.create({ data: event });
      from = to;
    }
    const status = details.steps.length === 0 ? 'NEW' : from;
    await prisma.report.update({
      where: { id: report.id },
      data: { status: status === 'DUPLICATE' && !extra.parentId ? 'NEW' : status, ...extra },
    });
    if (!parent && ['IN_PROGRESS', 'NEW_STALE', 'AWAITING_CONFIRMATION'].includes(scenario)) {
      parent = report;
    }
    reports.push({ ...report, status });
  }
  return reports;
}

async function seedEngagement(reports, warga) {
  for (const [index, report] of reports.entries()) {
    const supporters = sample(warga, (index * 3) % 14).filter((user) => user.id !== report.userId);
    for (const user of supporters) {
      await prisma.support.create({
        data: {
          reportId: report.id,
          userId: user.id,
          createdAt: new Date(report.createdAt.getTime() + HOUR),
        },
      });
    }
    for (const user of supporters.slice(0, Math.ceil(supporters.length / 2))) {
      await prisma.reaction.create({
        data: {
          reportId: report.id,
          userId: user.id,
          type: report.severity === 'DANGEROUS' ? 'DANGEROUS' : pick(['LONG_STANDING', 'ANNOYING']),
        },
      });
    }
    if (supporters.length) {
      await prisma.report.update({
        where: { id: report.id },
        data: { lastEngagementAt: new Date(report.createdAt.getTime() + 2 * HOUR) },
      });
    }
    await refreshReportScores(prisma, report.id);
  }
}

async function seedRatings(spec, board, warga) {
  for (const [index, stars] of spec.stars.entries()) {
    const user = warga[index];
    const ratedAt = at(Math.max(1, Math.min(spec.ageDays - 1, 2 + index * 1.5)));
    await prisma.boardFollower.upsert({
      where: { boardId_userId: { boardId: board.id, userId: user.id } },
      create: {
        boardId: board.id,
        userId: user.id,
        notifyLevel: index % 3 ? 'ALL' : 'DANGEROUS_ONLY',
      },
      update: {},
    });
    await prisma.boardRating.create({
      data: {
        boardId: board.id,
        userId: user.id,
        stars,
        quickTag: index % 3 === 0 ? (stars >= 4 ? 'RESPONSIVE' : stars <= 2 ? 'SLOW' : null) : null,
        createdAt: ratedAt,
        updatedAt: ratedAt,
      },
    });
  }
}

async function markOfficial(spec, board, users) {
  const { verification } = spec;
  if (!verification || verification.revokedDaysAgo) return;
  await prisma.board.update({
    where: { id: board.id },
    data: {
      verification: 'OFFICIAL',
      verifiedAt: at(verification.grantedDaysAgo),
      verifiedById: users.verifier.id,
    },
  });
}

async function seedVerificationLogs(spec, board, users) {
  const { verification } = spec;
  if (!verification) return;
  const snapshot = trustSnapshot(await prisma.board.findUnique({ where: { id: board.id } }));
  await prisma.boardVerificationLog.create({
    data: {
      boardId: board.id,
      action: 'GRANTED',
      actorUserId: users.verifier.id,
      reason: verification.note,
      snapshot,
      createdAt: at(verification.grantedDaysAgo),
    },
  });
  if (verification.revokedDaysAgo) {
    await prisma.boardVerificationLog.create({
      data: {
        boardId: board.id,
        action: 'REVOKED',
        actorUserId: users.verifier.id,
        reason: verification.reason,
        snapshot,
        createdAt: at(verification.revokedDaysAgo),
      },
    });
  }
}

async function seedModeration(boards, reportsByBoard, users, warga) {
  for (const user of warga.slice(0, boards.ayaniPalsu.spec.fakeFlags)) {
    await prisma.flag.create({
      data: {
        targetType: 'BOARD',
        targetId: boards.ayaniPalsu.board.id,
        userId: user.id,
        reason: 'FAKE_BOARD',
        note: 'Namanya mirip Board resmi Jalan Ahmad Yani, sepertinya bukan pengelola resmi.',
        createdAt: at(3),
      },
    });
  }
  const hidden = reportsByBoard.bungkul.find((report) => report.isHidden);
  for (const user of warga.slice(10, 13)) {
    await prisma.flag.create({
      data: {
        targetType: 'REPORT',
        targetId: hidden.id,
        userId: user.id,
        reason: 'SPAM',
        note: 'Isinya promosi, bukan laporan.',
        createdAt: at(1),
      },
    });
  }
  await prisma.ban.create({
    data: {
      targetType: 'USER',
      targetValue: String(users.nakal.id),
      reason: 'Mengirim laporan promosi berulang kali',
      expiresAt: at(-7),
      createdById: users.admin.id,
      createdAt: at(1),
    },
  });
}

async function seedFollowsAndNotifications(boards, reportsByBoard, users) {
  for (const key of ['siti', 'rudi']) {
    for (const boardKey of ['ayani', 'sman5', 'its']) {
      await prisma.boardFollower.upsert({
        where: { boardId_userId: { boardId: boards[boardKey].board.id, userId: users[key].id } },
        create: { boardId: boards[boardKey].board.id, userId: users[key].id },
        update: {},
      });
    }
  }
  const item = (report, board) => ({
    reportId: report.id,
    reportTitle: report.title,
    boardSlug: board.slug,
    boardName: board.name,
  });
  const ayani = boards.ayani.board;
  const ayaniReports = reportsByBoard.ayani;
  const rows = [
    [
      users.ratna.id,
      'HANDLER_DANGEROUS_REPORT',
      { ...item(ayaniReports[0], ayani), severity: 'DANGEROUS' },
      1,
      false,
    ],
    [
      users.ratna.id,
      'HANDLER_NEW_REPORT',
      { ...item(ayaniReports[1], ayani), severity: 'MEDIUM' },
      2,
      true,
    ],
    [users.ratna.id, 'BOARD_VERIFIED', { boardSlug: ayani.slug, boardName: ayani.name }, 25, true],
    [
      users.ratna.id,
      'BOARD_RATING_DIGEST',
      {
        boardSlug: ayani.slug,
        boardName: ayani.name,
        newRatings: 3,
        ratingCount: 26,
        trustScore: 4.4,
      },
      1,
      false,
    ],
    [
      users.siti.id,
      'REPORT_STATUS_CHANGED',
      { ...item(ayaniReports[2], ayani), status: 'IN_PROGRESS', statusLabel: 'Diproses' },
      1,
      false,
    ],
    [
      users.siti.id,
      'BOARD_NEW_REPORT',
      { ...item(ayaniReports[3], ayani), severity: 'LOW' },
      3,
      true,
    ],
    [
      users.bayu.id,
      'BOARD_VERIFICATION_REVOKED',
      {
        boardSlug: boards.alunalun.board.slug,
        boardName: boards.alunalun.board.name,
        reason: boards.alunalun.spec.verification.reason,
      },
      18,
      true,
    ],
    [
      users.hadi.id,
      'HANDLER_REPORT_REOPENED',
      item(
        reportsByBoard.sman5.find((report) => report.status === 'REOPENED'),
        boards.sman5.board,
      ),
      1,
      false,
    ],
  ];
  for (const [userId, type, data, daysAgo, read] of rows) {
    await prisma.notification.create({
      data: { userId, type, data, createdAt: at(daysAgo), readAt: read ? at(daysAgo, 2) : null },
    });
  }
}

async function main() {
  await assertSafeToSeed();
  const { users, warga } = await seedUsers();
  const boards = {};
  const reportsByBoard = {};
  const counter = { value: 0, tracking: false };
  for (const spec of BOARDS) {
    const board = await seedBoard(spec, users);
    boards[spec.key] = { spec, board };
    reportsByBoard[spec.key] = await seedReports(spec, board, users, warga, counter);
    await seedRatings(spec, board, warga);
  }
  const allReports = Object.values(reportsByBoard).flat();
  await seedEngagement(allReports, warga);
  for (const { spec, board } of Object.values(boards)) await markOfficial(spec, board, users);
  await recomputeAllBoardTrust();
  for (const { spec, board } of Object.values(boards)) {
    await seedVerificationLogs(spec, board, users);
  }
  await seedModeration(boards, reportsByBoard, users, warga);
  await seedFollowsAndNotifications(boards, reportsByBoard, users);
  await recomputeAllBoardTrust();
  logger.info(
    `Seed demo selesai: ${STAFF.length + WARGA_COUNT} akun, ${BOARDS.length} Board, ${allReports.length} laporan`,
  );
}

try {
  await main();
} catch (error) {
  logger.error({ err: error }, 'Seed demo gagal');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
