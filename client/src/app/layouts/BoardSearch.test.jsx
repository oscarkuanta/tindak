import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

const board = {
  id: 8,
  slug: 'jalan-rungkut',
  name: 'Jalan Rungkut',
  city: 'Surabaya',
  type: 'ROAD',
  verification: 'OFFICIAL',
  trustScore: 4.2,
  trustLabel: 'TRUSTED',
  followerCount: 50,
  activeReportCount: 2,
};

describe('Pencarian Board di header', () => {
  it('mendebounce pencarian lalu membuka saran dengan panah dan Enter', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'GET /boards/search': () => [
        200,
        { data: [board], meta: { page: 1, pageSize: 5, total: 1, totalPages: 1 } },
      ],
      'GET /boards/jalan-rungkut': () => [
        200,
        {
          data: {
            ...board,
            managerTitle: null,
            description: 'Board untuk laporan warga sekitar.',
            categories: [],
            viewer: null,
          },
        },
      ],
    });
    const { router } = renderApp('/');
    const user = userEvent.setup();
    const input = await screen.findByRole('combobox', { name: 'Cari Board' });
    await user.type(input, 'Rungkut');

    expect(await screen.findByText('Jalan Rungkut', {}, { timeout: 2500 })).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/b/jalan-rungkut'));
    expect(await screen.findByRole('heading', { name: 'Jalan Rungkut' })).toBeInTheDocument();
  });
});

describe('Board populer sebelum mengetik', () => {
  it('header menampilkan Board terpopuler saat kotak cari difokuskan', async () => {
    const searches = [];
    mockApi({
      'GET /auth/me': guestMe,
      'GET /boards/search': () => {
        searches.push('search');
        return [200, { data: [board], meta: { page: 1, pageSize: 5, total: 1, totalPages: 1 } }];
      },
      'GET /feed/home': () => [
        200,
        { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } },
      ],
      'GET /boards/popular': () => [200, { data: [] }],
    });
    renderApp('/');

    await userEvent.click(await screen.findByRole('combobox', { name: 'Cari Board' }));

    expect(await screen.findByText('Board terpopuler')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Jalan Rungkut/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lihat semua Board' })).toBeInTheDocument();
  });

  it('halaman Pilih Board langsung berisi Board terpopuler', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'GET /boards/search': () => [
        200,
        { data: [board], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } },
      ],
    });
    renderApp('/lapor');

    expect(await screen.findByText('Board terpopuler')).toBeInTheDocument();
    expect(screen.getByText('Jalan Rungkut')).toBeInTheDocument();
    expect(screen.queryByText('Cari Board terlebih dahulu')).not.toBeInTheDocument();
  });
});
