const CITY_PREFIX = /^(kota|kabupaten)(\s+administrasi)?\s+/i;
const MAX_SLUG_LENGTH = 100;

export function stripCityPrefix(city = '') {
  return city.trim().replace(CITY_PREFIX, '');
}

export function slugify(value = '') {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}

export function boardBaseSlug(name, city) {
  return slugify(`${name} ${stripCityPrefix(city)}`) || 'board';
}

export function nextAvailableSlug(base, takenSlugs) {
  const taken = new Set(takenSlugs);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
