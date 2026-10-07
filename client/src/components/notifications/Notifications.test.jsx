import { describe, expect, it } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';
import { activeSocket } from '../../test/fakeSocket.js';

const user = { id: 9, name: 'Siti', email: 'siti@example.com', avatarUrl: null, role: 'USER' };
const now = new Date().toISOString();

function notification(id, type, data, overrides = {}) {
  return { id, type, data, isRead: false, readAt: null, createdAt: now, ...overrides };
}

const LIST = [
  notification(3, 'REPORT_STATUS_CHANGED', {
    reportId: 7,
    reportTitle: 'Lubang besar',
    statusLabel: 'Diproses',
  }),
  notification(2, 'BOARD_VERIFIED', { boardSlug: 'kampus-its', boardName: 'Kampus ITS' }),
  notification(
    1,
    'BOARD_CANDIDATE_NEW',
    { boardSlug: 'kampus-its', boardName: 'Kampus ITS' },
    {
      isRead: true,
    },
  ),
];

function report(overrides = {}) {
  return {
    id: 7,
    title: 'Lubang besar',
    description: 'Lubang selebar satu meter.',
    locationDetail: 'Depan Indomaret',
    severity: 'MEDIUM',
    status: 'NEW',
    isAnonymous: true,
    board: { id: 1, slug: 'jalan-rungkut', name: 'Jalan Rungkut', status: 'ACTIVE' },
    category: { id: 1, name: 'Jalan Berlubang' },
    media: [],
    timeline: [],
    allowedActions: [],
    supportCount: 1,
    reactionCounts: { DANGEROUS: 0, LONG_STANDING: 0, ANNOYING: 0 },
    createdAt: now,
    ...overrides,
  };
}

function board(overrides = {}) {
  return {
    id: 1,
    slug: 'kampus-its',
    name: 'Kampus ITS',
    city: 'Kota Surabaya',
    type: 'CAMPUS',
    status: 'ACTIVE',
    verification: 'COMMUNITY',
    verifiedAt: null,
    trustScore: 4.4,
    trustLabel: 'TRUSTED',
    ratingCount: 20,
    categories: [],
    verificationHistory: [],
    viewer: null,
    ...overrides,
  };
}

describe('Lonceng notifikasi', () => {
  it('menampilkan badge, dropdown dengan ikon, dan menandai dibaca saat diklik', async () => {
    const calls = [];
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /notifications/unread-count': () => [200, { data: { count: 2 } }],
      'GET /notifications': () => [
        200,
        { data: LIST, meta: { page: 1, pageSize: 10, total: 3, totalPages: 1 } },
      ],
      'POST /notifications/3/read': () => {
        calls.push('read-3');
        return [200, { data: { ...LIST[0], isRead: true } }];
      },
      'GET /reports/7': () => [200, { data: report() }],
    });
    const { router } = renderApp('/');

    const bell = await screen.findByRole('button', { name: 'Notifikasi, 2 belum dibaca' });
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('2');
    await userEvent.click(bell);

    const panel = await screen.findByRole('dialog', { name: 'Notifikasi terbaru' });
    expect(
      await within(panel).findByText('Status laporan "Lubang besar" berubah menjadi Diproses'),
    ).toBeInTheDocument();
    expect(within(panel).getByText('Kampus ITS sekarang Official')).toBeInTheDocument();
    expect(within(panel).getByText('✔️')).toBeInTheDocument();
    expect(within(panel).getByText('🏅')).toBeInTheDocument();
    expect(within(panel).getAllByLabelText('Belum dibaca')).toHaveLength(2);

    await userEvent.click(within(panel).getByText(/Lubang besar/));

    await waitFor(() => expect(router.state.location.pathname).toBe('/laporan/7'));
    await waitFor(() => expect(calls).toEqual(['read-3']));
  });

  it('Tandai semua dibaca memanggil endpoint', async () => {
    let unread = 2;
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /notifications/unread-count': () => [200, { data: { count: unread } }],
      'GET /notifications': () => [
        200,
        { data: LIST, meta: { page: 1, pageSize: 10, total: 3, totalPages: 1 } },
      ],
      'POST /notifications/read-all': () => {
        unread = 0;
        return [200, { data: { updated: 2 } }];
      },
    });
    renderApp('/');

    await userEvent.click(await screen.findByRole('button', { name: /Notifikasi, 2/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Tandai semua dibaca' }));

    expect(await screen.findByRole('button', { name: 'Notifikasi' })).toBeInTheDocument();
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });

  it('tamu tidak melihat lonceng', async () => {
    mockApi({ 'GET /auth/me': guestMe });
    renderApp('/');

    expect(await screen.findByRole('link', { name: 'Masuk' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Notifikasi/ })).not.toBeInTheDocument();
  });
});

describe('Realtime', () => {
  it('notification:new memperbarui badge dan menampilkan toast', async () => {
    let count = 0;
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /notifications/unread-count': () => [200, { data: { count } }],
    });
    renderApp('/');
    await screen.findByRole('button', { name: 'Notifikasi' });

    count = 1;
    act(() => activeSocket().receive('notification:new', LIST[1]));

    expect(await screen.findByRole('button', { name: 'Notifikasi, 1 belum dibaca' })).toBeVisible();
    expect(await screen.findByText('Kampus ITS sekarang Official')).toBeInTheDocument();
  });

  it('status laporan berubah tanpa refresh dan halaman berlangganan room laporan', async () => {
    let status = 'NEW';
    mockApi({
      'GET /auth/me': guestMe,
      'GET /reports/7': () => [200, { data: report({ status }) }],
    });
    renderApp('/laporan/7');
    expect(await screen.findByText('Baru')).toBeInTheDocument();
    await waitFor(() =>
      expect(activeSocket().emitted).toContainEqual(['report:subscribe', { id: 7 }]),
    );

    status = 'IN_PROGRESS';
    act(() =>
      activeSocket().receive('report:updated', {
        id: 7,
        boardSlug: 'jalan-rungkut',
        status: 'IN_PROGRESS',
        supportCount: 3,
        reactionCounts: { DANGEROUS: 0, LONG_STANDING: 0, ANNOYING: 0 },
      }),
    );

    expect(await screen.findByText('Diproses')).toBeInTheDocument();
  });

  it('badge Official muncul saat board:updated diterima', async () => {
    let verification = 'COMMUNITY';
    mockApi({
      'GET /auth/me': guestMe,
      'GET /boards/kampus-its': () => [200, { data: board({ verification }) }],
    });
    renderApp('/b/kampus-its');
    await screen.findByRole('heading', { name: 'Kampus ITS' });
    expect(screen.queryByLabelText('Official')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(activeSocket().emitted).toContainEqual(['board:subscribe', 'kampus-its']),
    );

    verification = 'OFFICIAL';
    act(() =>
      activeSocket().receive('board:updated', {
        slug: 'kampus-its',
        status: 'ACTIVE',
        verification: 'OFFICIAL',
        verifiedAt: now,
      }),
    );

    expect((await screen.findAllByLabelText('Official')).length).toBeGreaterThan(0);
  });
});
