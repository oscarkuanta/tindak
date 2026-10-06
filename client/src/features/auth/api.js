import { api, ApiError } from '../../lib/api.js';

export async function getMe() {
  try {
    const { data } = await api.get('/auth/me');
    return data ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function login(credentials) {
  const { data } = await api.post('/auth/login', credentials);
  return data;
}

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function logout() {
  await api.post('/auth/logout');
}
