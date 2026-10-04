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

const membership = (id, role) => ({
  role,
  board: {
    id,
    slug: `board-${id}`,
    name: `Board ${id}`,
    city: 'Surabaya',
    type: 'AREA',
    verification: 'COMMUNITY',
    followerCount: 0,
    activeReportCount: 0,
  },
});

describe('Board Saya', () => {
  it('menampilkan peran dan menonaktifkan Buat Board ketika sudah mencapai batas', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /me/boards': () => [
        200,
        { data: [membership(1, 'OWNER'), membership(2, 'OWNER'), membership(3, 'OWNER')] },
      ],
    });
    renderApp('/board-saya');

    expect(await screen.findByText('3 dari 3 Board dibuat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buat Board' })).toBeDisabled();
    expect(screen.getAllByText('Penindak Utama')).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: 'Pengaturan' })).toHaveLength(3);
  });

  it('menampilkan label Penindak untuk anggota non-owner', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /me/boards': () => [200, { data: [membership(4, 'HANDLER')] }],
    });
    renderApp('/board-saya');

    expect(await screen.findByText('Penindak')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pengaturan' })).not.toBeInTheDocument();
  });
});
