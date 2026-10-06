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
