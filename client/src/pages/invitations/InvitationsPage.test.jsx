import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from '../../test/renderApp.jsx';

const invitation = {
  id: 5,
  createdAt: '2026-10-09T00:00:00.000Z',
  board: { id: 2, slug: 'jalan-melati', name: 'Jalan Melati', city: 'Kota Surabaya' },
};

describe('Halaman undangan Penindak', () => {
  it('kartu undangan bisa diklik untuk membuka Board', async () => {
    mockApi({
      'GET /auth/me': () => [
        200,
        { data: { id: 3, name: 'Siti', email: 's@x.com', role: 'USER' } },
      ],
      'GET /me/invitations': () => [200, { data: [invitation] }],
      'GET /boards/jalan-melati': () => [404, { error: { code: 'BOARD_NOT_FOUND', message: 'x' } }],
    });
    const { router } = renderApp('/undangan');

    const link = await screen.findByRole('link', { name: 'Buka Board Jalan Melati' });
    expect(link).toHaveAttribute('href', '/b/jalan-melati');
    expect(screen.getByRole('button', { name: 'Terima' })).toBeInTheDocument();

    await userEvent.click(link);
    expect(router.state.location.pathname).toBe('/b/jalan-melati');
  });
});
