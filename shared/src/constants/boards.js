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

export const FOLLOW_NOTIFY_LEVELS = Object.freeze(['ALL', 'DANGEROUS_ONLY', 'OFF']);
export const FOLLOW_NOTIFY_LEVEL_LABELS = Object.freeze({
  ALL: 'Semua laporan',
  DANGEROUS_ONLY: 'Hanya Berbahaya',
  OFF: 'Mati',
});

export const BOARD_MEMBER_STATUSES = Object.freeze(['INVITED', 'ACTIVE']);
export const BOARD_MEMBER_STATUS_LABELS = Object.freeze({
  INVITED: 'Diundang',
  ACTIVE: 'Aktif',
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

export const BOARD_STATUSES = Object.freeze(['ACTIVE', 'INACTIVE', 'FROZEN']);
export const BOARD_STATUS_LABELS = Object.freeze({
  ACTIVE: 'Aktif',
  INACTIVE: 'Tidak Aktif',
  FROZEN: 'Dibekukan',
});

export const BOARD_MAX_CATEGORIES = 20;
export const BOARD_MAX_EXTRA_CATEGORIES = 10;
export const BOARD_PROTECTED_CATEGORY = 'Lainnya';
export const DANGEROUS_TARGET_HOURS_MIN = 1;
export const DANGEROUS_TARGET_HOURS_MAX = 720;

export const BOARD_SEARCH_PAGE_SIZE = 20;
export const BOARD_SEARCH_MAX_PAGE_SIZE = 50;
export const BOARD_SIMILAR_LIMIT = 5;
export const CITY_SEARCH_LIMIT = 20;
