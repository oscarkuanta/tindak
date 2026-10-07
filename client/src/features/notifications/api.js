import { api } from '../../lib/api.js';

export function getNotifications({ page = 1, pageSize = 20, unread = false } = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (unread) query.set('unread', 'true');
  return api.get(`/notifications?${query.toString()}`);
}

export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) =>
  api.post(`/notifications/${encodeURIComponent(id)}/read`);
export const markAllNotificationsRead = () => api.post('/notifications/read-all');
