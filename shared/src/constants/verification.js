export const VERIFICATION_RULES = Object.freeze({
  MIN_RATING_COUNT: 20,
  MIN_TRUST_SCORE: 4.0,
  MIN_BOARD_AGE_DAYS: 30,
  SKIP_COOLDOWN_DAYS: 30,
  REVIEW_TRUST_SCORE_BELOW: 2.5,
  REVOKED_STATS_DAYS: 30,
});

export const TRUST_RULES = Object.freeze({
  PRIOR_RATING_COUNT: 5,
  PRIOR_RATING_STARS: 3,
  RATING_WEIGHT: 0.6,
  RESPONSE_WEIGHT: 0.4,
  RESPONSE_WINDOW_DAYS: 7,
  NEW_BELOW_RATING_COUNT: 5,
  TRUSTED_MIN_SCORE: 4.0,
  CAUTION_BELOW_SCORE: 2.5,
});

export const RATING_QUICK_TAGS = Object.freeze(['RESPONSIVE', 'SLOW', 'DOUBTFUL']);

export const RATING_QUICK_TAG_META = Object.freeze({
  RESPONSIVE: Object.freeze({ emoji: '👍', label: 'Tanggap' }),
  SLOW: Object.freeze({ emoji: '🐢', label: 'Lambat' }),
  DOUBTFUL: Object.freeze({ emoji: '❓', label: 'Diragukan' }),
});

export const RATING_BLOCK_REASONS = Object.freeze({
  LOGIN_REQUIRED: 'Masuk dulu untuk memberi rating',
  BOARD_STAFF: 'Penindak tidak bisa memberi rating ke Board sendiri',
  NOT_FOLLOWING: 'Ikuti Board ini dulu untuk memberi rating',
  BANNED: 'Akun kamu sedang diblokir',
  BOARD_FROZEN: 'Board ini sedang dibekukan',
});

export const VERIFICATION_ACTIONS = Object.freeze(['GRANTED', 'REVOKED', 'SKIPPED']);

export const VERIFICATION_ACTION_LABELS = Object.freeze({
  GRANTED: 'Dijadikan Official',
  REVOKED: 'Status Official dicabut',
  SKIPPED: 'Dilewati',
});

export const CANDIDATE_REQUIREMENTS = Object.freeze([
  'COMMUNITY',
  'RATING_COUNT',
  'TRUST_SCORE',
  'BOARD_AGE',
  'ACTIVE',
  'NO_FAKE_BOARD_FLAG',
  'NO_SKIP_COOLDOWN',
]);

export const CANDIDATE_REQUIREMENT_LABELS = Object.freeze({
  COMMUNITY: 'Berstatus Komunitas',
  RATING_COUNT: `Minimal ${VERIFICATION_RULES.MIN_RATING_COUNT} rating`,
  TRUST_SCORE: `Skor Kepercayaan minimal ${VERIFICATION_RULES.MIN_TRUST_SCORE.toFixed(1).replace('.', ',')}`,
  BOARD_AGE: `Umur Board minimal ${VERIFICATION_RULES.MIN_BOARD_AGE_DAYS} hari`,
  ACTIVE: 'Board aktif (tidak 💤 Tidak Aktif atau dibekukan)',
  NO_FAKE_BOARD_FLAG: 'Tidak ada tanda "Board Palsu" yang belum ditinjau',
  NO_SKIP_COOLDOWN: `Tidak dilewati dalam ${VERIFICATION_RULES.SKIP_COOLDOWN_DAYS} hari terakhir`,
});
