export const FLAG_TARGET_TYPES = Object.freeze(['REPORT', 'BOARD']);

export const FLAG_REASON_META = Object.freeze({
  SEXUAL: Object.freeze({ label: 'Konten seksual', severe: true }),
  VIOLENCE: Object.freeze({ label: 'Kekerasan', severe: true }),
  HATE: Object.freeze({ label: 'SARA/ujaran kebencian', severe: false }),
  PERSONAL_ATTACK: Object.freeze({
    label: 'Menyerang atau menyebut nama orang',
    severe: false,
  }),
  SPAM: Object.freeze({ label: 'Spam/iklan', severe: false }),
  NOT_COMPLAINT: Object.freeze({
    label: 'Bukan pengaduan masalah fisik',
    severe: false,
  }),
  FAKE_BOARD: Object.freeze({ label: 'Board palsu', severe: false }),
  SYSTEM_NSFW: Object.freeze({ label: 'Deteksi otomatis foto', severe: true }),
});

export const FLAG_REASON_ORDER = Object.freeze([
  'SEXUAL',
  'VIOLENCE',
  'SYSTEM_NSFW',
  'HATE',
  'PERSONAL_ATTACK',
  'FAKE_BOARD',
  'SPAM',
  'NOT_COMPLAINT',
]);

export const REPORT_FLAG_REASONS = Object.freeze([
  'SEXUAL',
  'VIOLENCE',
  'HATE',
  'PERSONAL_ATTACK',
  'SPAM',
  'NOT_COMPLAINT',
]);

export const BOARD_FLAG_REASONS = Object.freeze([
  'FAKE_BOARD',
  'HATE',
  'SEXUAL',
  'PERSONAL_ATTACK',
  'SPAM',
]);

export const FLAG_STATUSES = Object.freeze(['OPEN', 'ACCEPTED', 'REJECTED']);

export const MODERATION_RULES = Object.freeze({
  SEVERE_HIDE_WEIGHT: 2,
  OTHER_HIDE_WEIGHT: 3,
  FLAGS_PER_DAY: 20,
  ABUSER_REJECTED_FLAGS: 5,
  ABUSER_WINDOW_DAYS: 30,
  IP_HASH_RETENTION_DAYS: 90,
});

export const BAN_TARGET_TYPES = Object.freeze(['USER', 'GUEST_TOKEN', 'IP']);

export const BAN_TARGET_LABELS = Object.freeze({
  USER: 'Akun',
  GUEST_TOKEN: 'Perangkat tamu',
  IP: 'Jaringan (IP)',
});

export const BAN_DURATIONS = Object.freeze({
  '1d': 1,
  '7d': 7,
  '30d': 30,
  permanent: null,
});

export const BAN_DURATION_LABELS = Object.freeze({
  '1d': '1 hari',
  '7d': '7 hari',
  '30d': '30 hari',
  permanent: 'Permanen',
});

export const IP_BAN_DURATIONS = Object.freeze(['1d', '7d']);

export const FREEZE_DURATIONS = Object.freeze({ '7d': 7, '30d': 30, permanent: null });

export const FREEZE_DURATION_LABELS = Object.freeze({
  '7d': '7 hari',
  '30d': '30 hari',
  permanent: 'Permanen (sampai di-unfreeze manual)',
});
