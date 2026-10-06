export const USER_ROLES = Object.freeze({
  USER: 'USER',
  ADMIN: 'ADMIN',
  BOARD_ADMIN: 'BOARD_ADMIN',
});

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 191;

export const GOOGLE_LOGIN_ERRORS = Object.freeze({
  FAILED: 'google',
  UNAVAILABLE: 'google_unavailable',
});

export const AUTH_PATHS = Object.freeze({
  LOGIN: '/masuk',
  REGISTER: '/daftar',
});
