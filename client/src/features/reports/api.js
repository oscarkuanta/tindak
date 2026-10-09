import { api } from '../../lib/api.js';

function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function getBoardReports(slug, params = {}) {
  return api.get(withQuery(`/boards/${encodeURIComponent(slug)}/reports`, params));
}

export function createBoardReport(slug, { fields, photos }) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, String(value));
  for (const photo of photos) body.append('photos', photo);
  return api.post(`/boards/${encodeURIComponent(slug)}/reports`, body);
}

export function getMyReports(params = {}) {
  return api.get(withQuery('/me/reports', params));
}

export function claimGuestReports(items) {
  return api.post('/me/reports/claim', { items });
}
