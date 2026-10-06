import { api } from '../../lib/api.js';

const reportPath = (id, part) => `/reports/${encodeURIComponent(id)}/${part}`;

export function supportReport(id) {
  return api.put(reportPath(id, 'support'));
}

export function withdrawSupport(id) {
  return api.delete(reportPath(id, 'support'));
}

export function reactToReport(id, type) {
  return api.put(reportPath(id, 'reaction'), { type });
}

export function removeReaction(id) {
  return api.delete(reportPath(id, 'reaction'));
}
