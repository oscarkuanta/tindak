import { api } from '../../lib/api.js';

function searchPath(params = {}) {
  const { scopeType, ...apiParams } = params;
  if (scopeType) apiParams.type = scopeType;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(apiParams)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const suffix = query.toString();
  return `/boards/search${suffix ? `?${suffix}` : ''}`;
}

export function searchBoards(params) {
  return api.get(searchPath(params));
}

export function getBoard(slug) {
  return api.get(`/boards/${encodeURIComponent(slug)}`);
}

export function getSimilarBoards({ name, city }) {
  const query = new URLSearchParams({ name, city });
  return api.get(`/boards/similar?${query.toString()}`);
}

export function getCities() {
  return api.get('/meta/cities');
}

export function getMyBoards() {
  return api.get('/me/boards');
}

export function createBoard(payload) {
  return api.post('/boards', payload);
}

export function updateBoard(slug, payload) {
  return api.patch(`/boards/${encodeURIComponent(slug)}`, payload);
}

export function createBoardCategory(slug, payload) {
  return api.post(`/boards/${encodeURIComponent(slug)}/categories`, payload);
}

export function renameBoardCategory(slug, id, payload) {
  return api.patch(`/boards/${encodeURIComponent(slug)}/categories/${id}`, payload);
}

export function deleteBoardCategory(slug, id) {
  return api.delete(`/boards/${encodeURIComponent(slug)}/categories/${id}`);
}

export function reorderBoardCategories(slug, categoryIds) {
  return api.put(`/boards/${encodeURIComponent(slug)}/categories/order`, { categoryIds });
}

export function followBoard(slug) {
  return api.post(`/boards/${encodeURIComponent(slug)}/follow`);
}

export function unfollowBoard(slug) {
  return api.delete(`/boards/${encodeURIComponent(slug)}/follow`);
}

export function updateFollowNotifyLevel(slug, payload) {
  return api.patch(`/boards/${encodeURIComponent(slug)}/follow`, payload);
}

export function getMyFollows() {
  return api.get('/me/follows');
}

export function getBoardHandlers(slug) {
  return api.get(`/boards/${encodeURIComponent(slug)}/handlers`);
}

export function inviteBoardHandler(slug, payload) {
  return api.post(`/boards/${encodeURIComponent(slug)}/handlers`, payload);
}

export function removeBoardHandler(slug, userId) {
  return api.delete(`/boards/${encodeURIComponent(slug)}/handlers/${encodeURIComponent(userId)}`);
}

export function transferBoardOwnership(slug, payload) {
  return api.post(`/boards/${encodeURIComponent(slug)}/transfer`, payload);
}

export function searchHandlerCandidates(slug, q) {
  return api.get(
    `/boards/${encodeURIComponent(slug)}/handlers/candidates?q=${encodeURIComponent(q)}`,
  );
}
