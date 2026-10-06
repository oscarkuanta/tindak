import { api } from '../../lib/api.js';

export function getHomeFeed({ tab, page, pageSize }) {
  const query = new URLSearchParams({ tab, page: String(page), pageSize: String(pageSize) });
  return api.get(`/feed/home?${query.toString()}`);
}

export function getPopularBoards(limit) {
  return api.get(`/boards/popular?limit=${limit}`);
}
