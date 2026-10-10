import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from '../../test/renderApp.jsx';

const baseUser = {
  id: 1,
  name: 'Budi Santoso',
  email: 'budi@example.com',
  avatarUrl: null,
  hasPassword: true,
  needsOnboarding: false,
  createdAt: '2026-10-03T00:00:00.000Z',
};

describe('Link menu role website', () => {
  it.each([
    ['USER', false, false],
    ['ADMIN', false, true],
    ['BOARD_ADMIN', true, false],
  ])('menampilkan menu sesuai role %s', async (role, hasVerification, hasAdmin) => {
    mockApi({ 'GET /auth/me': () => [200, { data: { ...baseUser, role } }] });
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Menu akun Budi Santoso' }));

    expect(Boolean(screen.queryByRole('menuitem', { name: 'Verifikasi Board' }))).toBe(
      hasVerification,
    );
    expect(Boolean(screen.queryByRole('menuitem', { name: 'Panel Admin' }))).toBe(hasAdmin);
  });
});

describe('Keluar akun', () => {
  it('Admin keluar dari Panel Admin langsung ke Beranda tanpa popup login dan cache lama hilang', async () => {
    let loggedIn = true;
    mockApi({
      'GET /auth/me': () =>
        loggedIn
          ? [200, { data: { ...baseUser, role: 'ADMIN' } }]
          : [401, { error: { code: 'UNAUTHENTICATED', message: 'Kamu belum masuk' } }],
      'GET /admin/stats': () => [
        200,
        {
          data: {
            users: { total: 1 },
            boards: { total: 0, active: 0, inactive: 0, frozen: 0, official: 0 },
            reports: { total: 0, active: 0, resolved: 0, hidden: 0, removed: 0 },
            moderation: { openFlags: 0, openTargets: 0 },
            bans: { active: 0 },
          },
        },
      ],
      'POST /auth/logout': () => {
        loggedIn = false;
        return [200, { data: { ok: true } }];
      },
    });
    const { router } = renderApp('/admin');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Menu akun Budi Santoso' }));
    await user.click(screen.getByRole('menuitem', { name: /Keluar/ }));

    await screen.findAllByRole('link', { name: 'Masuk' });
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Beranda' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
