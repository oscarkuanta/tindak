import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { mockApi, renderApp } from '../../test/renderApp.jsx';

const user = {
  id: 1,
  name: 'Budi Santoso',
  email: 'budi@example.com',
  avatarUrl: null,
  role: 'USER',
  hasPassword: true,
  needsOnboarding: false,
  createdAt: '2026-10-03T00:00:00.000Z',
};

describe('Pengaturan Board', () => {
  it('menolak akses untuk user yang bukan OWNER', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /boards/jalan-rungkut': () => [
        200,
        {
          data: {
            id: 2,
            slug: 'jalan-rungkut',
            name: 'Jalan Rungkut',
            viewer: { isFollowing: false, role: 'HANDLER' },
          },
        },
      ],
    });
    renderApp('/b/jalan-rungkut/pengaturan');

    expect(await screen.findByText('403 · Akses ditolak')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Kategori' })).not.toBeInTheDocument();
  });
});
