import { api } from '../../lib/api.js';

const boardPath = (slug, part) => `/boards/${encodeURIComponent(slug)}/${part}`;
const adminPath = (slug, part = '') =>
  `/board-admin/boards/${encodeURIComponent(slug)}${part ? `/${part}` : ''}`;

function query(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const getMyRating = (slug) => api.get(boardPath(slug, 'rating/me'));
export const getRatingSummary = (slug) => api.get(boardPath(slug, 'ratings/summary'));
export const rateBoard = (slug, payload) => api.put(boardPath(slug, 'rating'), payload);

export const getBoardAdminStats = () => api.get('/board-admin/stats');
export const getCandidates = (params) => api.get(`/board-admin/candidates${query(params)}`);
export const getOfficialBoards = (params) => api.get(`/board-admin/official${query(params)}`);
export const getVerificationDetail = (slug) => api.get(adminPath(slug));
export const verifyBoard = (slug, payload) => api.post(adminPath(slug, 'verify'), payload);
export const skipBoard = (slug, payload) => api.post(adminPath(slug, 'skip'), payload);
export const revokeVerification = (slug, payload) => api.post(adminPath(slug, 'revoke'), payload);
