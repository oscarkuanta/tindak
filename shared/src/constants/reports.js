export const REPORT_SEVERITIES = Object.freeze(['LOW', 'MEDIUM', 'DANGEROUS']);

export const REPORT_SEVERITY_LABELS = Object.freeze({
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  DANGEROUS: 'Berbahaya',
});

export const REPORT_SEVERITY_DESCRIPTIONS = Object.freeze({
  LOW: 'Gangguan ringan yang tidak berisiko langsung.',
  MEDIUM: 'Masalah yang mengganggu aktivitas dan perlu ditangani.',
  DANGEROUS: 'Masalah yang berisiko mencederai atau membahayakan orang.',
});

export const REPORT_STATUSES = Object.freeze([
  'NEW',
  'NEED_INFO',
  'IN_PROGRESS',
  'AWAITING_CONFIRMATION',
  'RESOLVED',
  'REOPENED',
  'REJECTED',
  'DUPLICATE',
]);

export const REPORT_STATUS_LABELS = Object.freeze({
  NEW: 'Baru',
  NEED_INFO: 'Perlu Info',
  IN_PROGRESS: 'Diproses',
  AWAITING_CONFIRMATION: 'Menunggu Konfirmasi',
  RESOLVED: 'Selesai',
  REOPENED: 'Dibuka Ulang',
  REJECTED: 'Ditolak',
  DUPLICATE: 'Duplikat',
});

export const REPORT_MAX_PHOTOS = 4;
export const REPORT_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const REPORT_ALLOWED_PHOTO_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

export const REPORT_ACTIVE_STATUSES = Object.freeze([
  'NEW',
  'NEED_INFO',
  'IN_PROGRESS',
  'AWAITING_CONFIRMATION',
  'REOPENED',
]);

export const REPORT_MEDIA_KINDS = Object.freeze(['BEFORE', 'AFTER', 'EXTRA']);
export const REPORT_SORTS = Object.freeze(['hot', 'priority', 'new', 'resolved']);
export const REPORT_REPORTER_TYPES = Object.freeze(['GUEST', 'ACCOUNT']);

export const REPORT_TITLE_MAX = 100;
export const REPORT_LOCATION_MAX = 200;
export const REPORT_DESCRIPTION_MIN = 20;
export const REPORT_DESCRIPTION_MAX = 2000;

export const REPORT_LIST_PAGE_SIZE = 10;
export const REPORT_LIST_MAX_PAGE_SIZE = 50;

export const REPORT_LIMITS = Object.freeze({
  GUEST_PER_DAY: 3,
  NETWORK_PER_DAY: 30,
  USER_PER_DAY: 5,
  GUEST_COOLDOWN_SECONDS: 120,
  USER_COOLDOWN_SECONDS: 60,
});

export const TRACKING_CODE_LENGTH = 8;
export const TRACKING_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const REACTION_TYPES = Object.freeze(['DANGEROUS', 'LONG_STANDING', 'ANNOYING']);

export const REACTION_META = Object.freeze({
  DANGEROUS: Object.freeze({
    label: 'Berbahaya',
    description: 'Bisa melukai orang',
  }),
  LONG_STANDING: Object.freeze({
    label: 'Sudah Lama',
    description: 'Masalah dibiarkan lama',
  }),
  ANNOYING: Object.freeze({
    label: 'Mengganggu',
    description: 'Mengganggu aktivitas',
  }),
});

export const REPORT_LOCKED_STATUSES = Object.freeze(['RESOLVED', 'REJECTED', 'DUPLICATE']);

export const HOME_FEED_TABS = Object.freeze(['following', 'nearby', 'hot']);
export const POPULAR_BOARDS_LIMIT = 6;
