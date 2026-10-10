import { api } from '../../lib/api.js';

export function getHomeFeed({ tab, city, page, pageSize }) {
  const query = new URLSearchParams({ tab, page: String(page), pageSize: String(pageSize) });
  if (city) query.set('city', city);
  return api.get(`/feed/home?${query.toString()}`);
}
