import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

const admin = { id: 1, name: 'Admin', email: 'admin@tindak.test', avatarUrl: null, role: 'ADMIN' };
const boardAdmin = { ...admin, id: 2, role: 'BOARD_ADMIN', name: 'Admin Board' };

const stats = {
  users: { total: 4 },
  boards: { total: 2, active: 2, inactive: 0, frozen: 0, official: 1 },
  reports: { total: 5, active: 3, resolved: 1, hidden: 1, removed: 0 },
  moderation: { openFlags: 3, openTargets: 2 },
  bans: { active: 1 },
};

function queueItem() {
  return {
    targetType: 'REPORT',
    targetId: 7,
    worstReason: 'SEXUAL',
    reasons: ['SEXUAL'],
    flagCount: 2,
    flags: [
      {
        id: 1,
        reason: 'SEXUAL',
        note: 'tidak pantas',
        weight: 1,
        createdAt: '2026-10-05T00:00:00.000Z',
        flagger: { id: 5, name: 'Budi' },
      },
    ],
    report: {
      id: 7,
      title: 'Laporan bermasalah',
      description: 'Isi laporan',
      isHidden: true,
      hiddenByHandler: false,
      board: { id: 1, slug: 'jalan-rungkut', name: 'Jalan Rungkut' },
      media: [],
      reporterType: 'GUEST',
      reporter: null,
      ipHashMasked: 'a1b2c3…beef',
      guestTokenMasked: 'ffeedd…0011',
      history: { totalReports: 3, removedReports: 1, hiddenReports: 1, bans: [] },
    },
    board: null,
  };
}

const boardRow = (overrides = {}) => ({
  id: 3,
  slug: 'pemkot-palsu',
  name: 'Pemkot Palsu',
  city: 'Kota Surabaya',
  status: 'ACTIVE',
  verification: 'OFFICIAL',
  owner: { id: 9, name: 'Siti', email: 'siti@example.com' },
  reportCount: 2,
  openFlagCount: 4,
  fakeBoardFlagCount: 4,
  restoredByAdminCount: 0,
  ...overrides,
});

describe('Panel Admin', () => {
  it('menolak Admin Board', async () => {
    mockApi({ 'GET /auth/me': () => [200, { data: boardAdmin }] });
    renderApp('/admin');

    expect(await screen.findByText('403 · Akses ditolak')).toBeInTheDocument();
  });

  it('tamu diarahkan ke halaman masuk', async () => {
    mockApi({ 'GET /auth/me': guestMe });
    const { router } = renderApp('/admin/moderasi');

    await waitFor(() => expect(router.state.location.pathname).toBe('/masuk'));
  });

  it('menampilkan statistik dashboard dan mengalihkan /panel-admin', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: admin }],
      'GET /admin/stats': () => [200, { data: stats }],
    });
    const { router } = renderApp('/panel-admin');

    expect(await screen.findByText('Konten menunggu tinjauan')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
  });

  it('antrean menampilkan alasan, IP tersamar, dan mengirim Hapus + Ban', async () => {
    let removeBody;
    mockApi({
      'GET /auth/me': () => [200, { data: admin }],
      'GET /admin/moderation': () => [
        200,
        { data: [queueItem()], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
      ],
      'POST /admin/reports/7/remove': (options) => {
        removeBody = JSON.parse(options.body);
        return [200, { data: { report: queueItem().report, ban: null } }];
      },
    });
    renderApp('/admin/moderasi');

    expect(await screen.findByText('Laporan bermasalah')).toBeInTheDocument();
    expect(screen.getByText('a1b2c3…beef')).toBeInTheDocument();
    expect(screen.getAllByText(/Konten seksual/).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Hapus + Ban' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText('Target ban'), 'IP');
    expect(within(dialog).queryByRole('option', { name: 'Permanen' })).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Alasan ban'), 'Spam berulang');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hapus' }));

    await waitFor(() =>
      expect(removeBody).toEqual({
        ban: { targetType: 'IP', duration: '7d', reason: 'Spam berulang' },
      }),
    );
  });

  it('membekukan Board Official menampilkan peringatan pencabutan', async () => {
    let freezeBody;
    mockApi({
      'GET /auth/me': () => [200, { data: admin }],
      'GET /admin/boards': () => [
        200,
        { data: [boardRow()], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
      ],
      'POST /admin/boards/pemkot-palsu/freeze': (options) => {
        freezeBody = JSON.parse(options.body);
        return [
          200,
          {
            data: {
              slug: 'pemkot-palsu',
              status: 'FROZEN',
              verification: 'COMMUNITY',
              verificationRevoked: true,
            },
          },
        ];
      },
    });
    renderApp('/admin/board');

    expect(await screen.findByText(/4 tanda Board palsu/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Bekukan' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Status Official Board ini akan ikut dicabut.')).toBeVisible();
    await userEvent.type(within(dialog).getByLabelText('Alasan pembekuan'), 'Board palsu');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bekukan' }));

    await waitFor(() => expect(freezeBody).toEqual({ reason: 'Board palsu' }));
    expect(
      await screen.findByText('Board dibekukan dan status Official dicabut'),
    ).toBeInTheDocument();
  });

  it('Board Komunitas tidak menampilkan peringatan pencabutan', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: admin }],
      'GET /admin/boards': () => [
        200,
        {
          data: [boardRow({ verification: 'COMMUNITY' })],
          meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      ],
    });
    renderApp('/admin/board');

    await userEvent.click(await screen.findByRole('button', { name: 'Bekukan' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByText('Status Official Board ini akan ikut dicabut.'),
    ).not.toBeInTheDocument();
  });
});
