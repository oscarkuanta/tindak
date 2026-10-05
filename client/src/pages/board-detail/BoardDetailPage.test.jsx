import { describe, expect, it } from 'vitest';
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
});
