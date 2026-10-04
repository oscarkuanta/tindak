import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

const user = {
  id: 4,
  name: 'Dewi Lestari',
  email: 'dewi@example.com',
  avatarUrl: null,
  role: 'USER',
  hasPassword: true,
  needsOnboarding: false,
  createdAt: '2026-10-04T00:00:00.000Z',
};

function makeBoard() {
  return {
    id: 8,
    slug: 'jalan-melati',
    name: 'Jalan Melati',
    city: 'Surabaya',
    type: 'ROAD',
    verification: 'COMMUNITY',
    followerCount: 12,
    activeReportCount: 0,
    categories: [],
    viewer: { isFollowing: false, notifyLevel: null, role: null },
  };
}

describe('FollowButton', () => {
  it('membuka LoginModal untuk tamu', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'GET /boards/jalan-melati': () => [200, { data: makeBoard() }],
    });
    renderApp('/b/jalan-melati');

    fireEvent.click(await screen.findByRole('button', { name: 'Ikuti' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('Masuk untuk mengikuti Board ini');
  });

  it('mengikuti Board, menampilkan menu notifikasi, dan menyimpan tingkat pilihan', async () => {
    let board = makeBoard();
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /boards/jalan-melati': () => [200, { data: board }],
      'GET /me/follows': () => [
        200,
        {
          data: board.viewer.isFollowing ? [{ board, notifyLevel: board.viewer.notifyLevel }] : [],
        },
      ],
      'POST /boards/jalan-melati/follow': () => {
        board = {
          ...board,
          followerCount: board.followerCount + 1,
          viewer: { isFollowing: true, notifyLevel: 'ALL', role: null },
        };
        return [200, { data: { notifyLevel: 'ALL' } }];
      },
      'PATCH /boards/jalan-melati/follow': (options) => {
        const body = JSON.parse(options.body);
        board = { ...board, viewer: { ...board.viewer, notifyLevel: body.notifyLevel } };
        return [200, { data: { notifyLevel: body.notifyLevel } }];
      },
    });
    renderApp('/b/jalan-melati');

    fireEvent.click(await screen.findByRole('button', { name: 'Ikuti' }));
    const followingButton = await screen.findByRole('button', { name: /Diikuti/ });
    fireEvent.click(followingButton);
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Hanya Berbahaya/ }));

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Diikuti/ }));
    expect(screen.getByRole('menuitemradio', { name: /Hanya Berbahaya/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
