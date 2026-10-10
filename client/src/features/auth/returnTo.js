import { AUTH_PATHS, USER_ROLES } from '@tindak/shared';

const BASE = 'http://tindak.local';
const AUTH_ROUTES = new Set(Object.values(AUTH_PATHS));

export function safeReturnTo(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;

  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE || AUTH_ROUTES.has(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

const STAFF_PATHS = [
  ['/admin', USER_ROLES.ADMIN],
  ['/panel-admin', USER_ROLES.ADMIN],
  ['/verifikasi', USER_ROLES.BOARD_ADMIN],
];

export function canVisit(user, path) {
  const rule = STAFF_PATHS.find(
    ([prefix]) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
  );
  return !rule || user?.role === rule[1];
}

export function returnToFor(user, value) {
  const target = safeReturnTo(value);
  return canVisit(user, target) ? target : '/';
}

export function loginPath(returnTo) {
  const target = safeReturnTo(returnTo);
  if (target === '/') return AUTH_PATHS.LOGIN;
  return `${AUTH_PATHS.LOGIN}?returnTo=${encodeURIComponent(target)}`;
}

export function googleLoginUrl(returnTo) {
  return `/api/auth/google?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}
