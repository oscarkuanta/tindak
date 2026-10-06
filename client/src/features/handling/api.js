import { api } from '../../lib/api.js';

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, typeof value === 'boolean' ? String(value) : String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function getReportQueue(slug, params) {
  return api.get(`/boards/${encodeURIComponent(slug)}/queue${buildQuery(params)}`);
}

export function getReportDetail(id) {
  return api.get(`/reports/${encodeURIComponent(id)}`);
}

export function getTrackedReport(code, secret) {
  return api.get(`/track/${encodeURIComponent(code)}${buildQuery({ secret })}`);
}

export function searchBoardReports(slug, q) {
  return api.get(
    `/boards/${encodeURIComponent(slug)}/reports${buildQuery({ sort: 'new', page: 1, pageSize: 10, q })}`,
  );
}

export function processReport(id, payload = {}) {
  return api.post(`/reports/${encodeURIComponent(id)}/process`, payload);
}

export function requestReportInfo(id, payload) {
  return api.post(`/reports/${encodeURIComponent(id)}/request-info`, payload);
}

export function answerReportInfo(id, payload) {
  return api.post(`/reports/${encodeURIComponent(id)}/answer-info`, payload);
}

export function rejectReport(id, payload) {
  return api.post(`/reports/${encodeURIComponent(id)}/reject`, payload);
}

export function markReportDuplicate(id, payload) {
  return api.post(`/reports/${encodeURIComponent(id)}/duplicate`, payload);
}

export function resolveReport(id, body) {
  return api.post(`/reports/${encodeURIComponent(id)}/resolve`, body);
}

export function confirmReport(id, body) {
  return api.post(`/reports/${encodeURIComponent(id)}/confirm`, body);
}
