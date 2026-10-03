import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';
import { safeReturnTo } from './returnTo.js';

describe('RequireAuth', () => {
  it('mengarahkan tamu ke /masuk dengan returnTo halaman yang diminta', async () => {
    mockApi({ 'GET /auth/me': guestMe });
    const { router } = renderApp('/profil?tab=akun');

    await waitFor(() => expect(router.state.location.pathname).toBe('/masuk'));
    expect(router.state.location.search).toBe('?returnTo=%2Fprofil%3Ftab%3Dakun');
    expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeInTheDocument();
  });

  it('menampilkan halaman untuk user yang sudah login', async () => {
    mockApi({
      'GET /auth/me': () => [
        200,
        { data: { id: 1, name: 'Budi Santoso', email: 'budi@example.com', avatarUrl: null } },
      ],
    });
    renderApp('/profil');

    expect(await screen.findByRole('heading', { name: 'Profil' })).toBeInTheDocument();
    expect(screen.getAllByText('budi@example.com').length).toBeGreaterThan(0);
  });
});

describe('safeReturnTo', () => {
  it.each([
    ['/profil', '/profil'],
    ['/b/x?tab=1', '/b/x?tab=1'],
    ['https://evil.com', '/'],
    ['//evil.com', '/'],
    ['/\\evil.com', '/'],
    ['/masuk', '/'],
    [null, '/'],
  ])('%s menjadi %s', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});
