import { api } from '../../lib/api.js';

function query(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const createFlag = (payload) => api.post('/flags', payload);

export const getAdminStats = () => api.get('/admin/stats');
export const getModerationQueue = (params) => api.get(`/admin/moderation${query(params)}`);
export const restoreReport = (id, payload = {}) =>
  api.post(`/admin/reports/${encodeURIComponent(id)}/restore`, payload);
export const removeReport = (id, payload = {}) =>
  api.post(`/admin/reports/${encodeURIComponent(id)}/remove`, payload);
export const getBans = (params) => api.get(`/admin/bans${query(params)}`);
export const createBan = (payload) => api.post('/admin/bans', payload);
export const revokeBan = (id) => api.delete(`/admin/bans/${encodeURIComponent(id)}`);
export const getAdminBoards = (params) => api.get(`/admin/boards${query(params)}`);
export const freezeBoard = (slug, payload) =>
  api.post(`/admin/boards/${encodeURIComponent(slug)}/freeze`, payload);
export const unfreezeBoard = (slug) =>
  api.post(`/admin/boards/${encodeURIComponent(slug)}/unfreeze`, {});
export const dismissBoardFlags = (slug, payload = {}) =>
  api.post(`/admin/boards/${encodeURIComponent(slug)}/dismiss-flags`, payload);
export const getAdminUsers = (params) => api.get(`/admin/users${query(params)}`);
export const getAuditLogs = (params) => api.get(`/admin/audit-logs${query(params)}`);
