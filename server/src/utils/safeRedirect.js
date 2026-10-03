const BASE = 'http://tindak.local';
const MAX_LENGTH = 500;

function hasUnsafeCharacter(value) {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f || char === '\\') return true;
  }
  return false;
}

export function safeRedirectPath(value, fallback = '/') {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (hasUnsafeCharacter(value)) return fallback;

  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
