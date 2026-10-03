import { AUTH_PATHS } from '@tindak/shared';

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

export function loginPath(returnTo) {
  const target = safeReturnTo(returnTo);
  if (target === '/') return AUTH_PATHS.LOGIN;
  return `${AUTH_PATHS.LOGIN}?returnTo=${encodeURIComponent(target)}`;
}

export function googleLoginUrl(returnTo) {
  return `/api/auth/google?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}
