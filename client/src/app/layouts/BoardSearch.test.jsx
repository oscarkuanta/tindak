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
