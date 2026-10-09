import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

const board = {
  id: 12,
  slug: 'jalan-melati',
  name: 'Jalan Melati',
  city: 'Surabaya',
  type: 'ROAD',
  verification: 'COMMUNITY',
  description: 'Board untuk laporan kondisi Jalan Melati.',
  categories: [{ id: 3, name: 'Jalan Berlubang' }],
  followerCount: 0,
  activeReportCount: 0,
  handlerCount: 1,
  viewer: null,
};

describe('Feed laporan Board', () => {
  it('menampilkan laporan dari API pada halaman Board', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'GET /boards/jalan-melati': () => [200, { data: board }],
      'GET /boards/jalan-melati/reports': () => [
        200,
        {
          data: [
            {
              id: 42,
              title: 'Lubang besar dekat halte',
              severity: 'DANGEROUS',
              status: 'NEW',
              category: { name: 'Jalan Berlubang' },
              locationDetail: 'Dekat halte Melati',
              createdAt: '2026-10-05T00:00:00.000Z',
              media: [],
            },
          ],
          meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        },
      ],
    });
    renderApp('/b/jalan-melati');

    expect(
      await screen.findByRole('heading', { name: 'Lubang besar dekat halte' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Berbahaya')).toBeInTheDocument();
    expect(screen.getByText('Dekat halte Melati')).toBeInTheDocument();
  });

  it('menampilkan tautan Antrean dan Dashboard untuk Penindak Board', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: { id: 6, name: 'Siti Aminah', role: 'USER' } }],
      'GET /boards/jalan-melati': () => [
        200,
        { data: { ...board, viewer: { role: 'HANDLER', isFollowing: false, notifyLevel: null } } },
      ],
      'GET /boards/jalan-melati/reports': () => [
        200,
        { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } },
      ],
    });
    renderApp('/b/jalan-melati');

    expect(await screen.findByRole('link', { name: 'Antrean Laporan' })).toHaveAttribute(
      'href',
      '/b/jalan-melati/antrean',
    );
    expect(screen.getByLabelText('Kamu Penindak Board ini')).toHaveTextContent('Penindak');
    expect(screen.queryByRole('link', { name: /Dashboard/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Opsi Board' }));
    expect(screen.getByRole('menuitem', { name: 'Dashboard Statistik' })).toHaveAttribute(
      'href',
      '/b/jalan-melati/dashboard',
    );
    expect(screen.queryByRole('menuitem', { name: 'Pengaturan Board' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Tandai Pelanggaran' })).not.toBeInTheDocument();
  });
});
