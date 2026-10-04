import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

describe('Cari Board', () => {
  it('menyimpan filter scopeType di URL dan menerjemahkannya ke type API', async () => {
    const fetchMock = mockApi({
      'GET /auth/me': guestMe,
      'GET /meta/cities': () => [200, { data: [{ name: 'Surabaya', province: 'Jawa Timur' }] }],
      'GET /boards/search': () => [
        200,
        {
          data: [
            {
              id: 9,
              slug: 'board-rungkut',
              name: 'Board Rungkut',
              city: 'Surabaya',
              type: 'ROAD',
              verification: 'OFFICIAL',
              trustLabel: 'NEW',
              followerCount: 0,
              activeReportCount: 0,
            },
          ],
          meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      ],
    });
    const { router } = renderApp('/cari?q=Rungkut&scopeType=ROAD&verification=OFFICIAL');

    expect(await screen.findByRole('link', { name: /Board Rungkut Official/ })).toBeInTheDocument();
    expect(router.state.location.search).toContain('scopeType=ROAD');
    const searchRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).startsWith('/api/boards/search'),
    );
    expect(searchRequest[0]).not.toContain('scopeType');
    expect(searchRequest[0]).toContain('type=ROAD');
  });
});
