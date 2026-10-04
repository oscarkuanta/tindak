export const BOARD_TYPES = Object.freeze([
  'SCHOOL',
  'CAMPUS',
  'OFFICE',
  'ROAD',
  'AREA',
  'PUBLIC_FACILITY',
  'OTHER',
]);

export const BOARD_TYPE_LABELS = Object.freeze({
  SCHOOL: 'Sekolah',
  CAMPUS: 'Kampus',
  OFFICE: 'Kantor',
  ROAD: 'Jalan',
  AREA: 'Wilayah',
  PUBLIC_FACILITY: 'Fasilitas Umum',
  OTHER: 'Lainnya',
});

export const BOARD_TYPE_ICONS = Object.freeze({
  SCHOOL: '🏫',
  CAMPUS: '🎓',
  OFFICE: '🏢',
  ROAD: '🛣️',
  AREA: '🏘️',
  PUBLIC_FACILITY: '🏥',
  OTHER: '📍',
});

export const BOARD_VERIFICATIONS = Object.freeze(['COMMUNITY', 'OFFICIAL']);
export const BOARD_VERIFICATION_LABELS = Object.freeze({
  COMMUNITY: 'Komunitas',
  OFFICIAL: 'Official',
});

export const BOARD_ROLES = Object.freeze(['OWNER', 'HANDLER']);
export const BOARD_ROLE_LABELS = Object.freeze({
  OWNER: 'Penindak Utama',
  HANDLER: 'Penindak',
});

export const TRUST_LABELS = Object.freeze(['NEW', 'TRUSTED', 'NONE', 'CAUTION', 'INACTIVE']);
export const TRUST_LABEL_TEXT = Object.freeze({
  NEW: 'Baru',
  TRUSTED: 'Terpercaya',
  NONE: '',
  CAUTION: 'Perlu Waspada',
  INACTIVE: 'Tidak Aktif',
});

export const BOARD_DEFAULT_CATEGORIES = Object.freeze({
  SCHOOL: [
    'Kebersihan',
    'Kerusakan Fasilitas',
    'Listrik',
    'Air dan Sanitasi',
    'Keamanan',
    'Lainnya',
  ],
  CAMPUS: [
    'Kebersihan',
    'Kerusakan Fasilitas',
    'Listrik',
    'Air dan Sanitasi',
    'Keamanan',
    'Lainnya',
  ],
  OFFICE: [
    'Kebersihan',
    'Kerusakan Fasilitas',
    'Listrik',
    'Air dan Sanitasi',
    'Keamanan',
    'Lainnya',
  ],
  ROAD: [
    'Jalan Berlubang',
    'Lampu Jalan',
    'Drainase dan Banjir',
    'Rambu dan Marka',
    'Pohon Tumbang',
    'Lainnya',
  ],
  AREA: ['Sampah', 'Drainase', 'Penerangan', 'Fasilitas Rusak', 'Keamanan', 'Lainnya'],
  PUBLIC_FACILITY: ['Sampah', 'Drainase', 'Penerangan', 'Fasilitas Rusak', 'Keamanan', 'Lainnya'],
  OTHER: ['Sampah', 'Drainase', 'Penerangan', 'Fasilitas Rusak', 'Keamanan', 'Lainnya'],
});

export const BOARD_CREATION_LIMIT = 3;
export const DEFAULT_DANGEROUS_TARGET_HOURS = 48;
