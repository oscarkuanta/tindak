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
