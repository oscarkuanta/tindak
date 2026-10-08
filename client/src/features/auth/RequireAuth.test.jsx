import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';
import { safeReturnTo } from './returnTo.js';

describe('RequireAuth', () => {
  it('tamu melihat pesan dan popup login, bukan langsung dialihkan', async () => {
    mockApi({ 'GET /auth/me': guestMe });
    const { router } = renderApp('/board-diikuti?tab=semua');

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Masuk untuk melihat Board yang kamu ikuti' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/board-diikuti');
    const loginLinks = screen.getAllByRole('link', { name: 'Masuk', hidden: true });
    expect(loginLinks[0]).toHaveAttribute('href', '/masuk?returnTo=%2Fboard-diikuti%3Ftab%3Dsemua');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Masuk dengan email' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/masuk'));
    expect(router.state.location.search).toBe('?returnTo=%2Fboard-diikuti%3Ftab%3Dsemua');
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
