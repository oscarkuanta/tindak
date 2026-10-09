import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfficialBadge, TrustBadge } from '../boards/BoardBadges.jsx';
import { mockApi, renderApp } from '../../test/renderApp.jsx';

const user = { id: 9, name: 'Siti', email: 'siti@example.com', avatarUrl: null, role: 'USER' };
const verifier = { ...user, id: 2, name: 'Admin Board', role: 'BOARD_ADMIN' };

function boardDetail(overrides = {}) {
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
    averageStars: 4.8,
    responseRate: 90,
    rejectedPercentage: 5,
    restoredByAdminCount: 0,
    followerCount: 30,
    activeReportCount: 2,
    handlerCount: 1,
    categories: [],
    verificationHistory: [],
    viewer: { isFollowing: false, notifyLevel: null, role: null },
    ...overrides,
  };
}

const summary = {
  ratingCount: 20,
  distribution: { 1: 0, 2: 0, 3: 1, 4: 3, 5: 16 },
  quickTags: { RESPONSIVE: 5, SLOW: 0, DOUBTFUL: 0 },
};

function verificationDetail(overrides = {}) {
  return {
    ...boardDetail(),
    ageDays: 40,
    candidateSince: '2026-10-01T00:00:00.000Z',
    description: 'Board kampus',
    owner: { id: 5, name: 'Siti', email: 'siti@example.com' },
    distribution: summary.distribution,
    quickTags: summary.quickTags,
    reports: { total: 10, resolved: 8, rejected: 1 },
    flags: {},
    checklist: [
      { key: 'RATING_COUNT', label: 'Minimal 20 rating', passed: true },
      { key: 'BOARD_AGE', label: 'Umur Board minimal 30 hari', passed: false },
    ],
    history: [],
    ...overrides,
  };
}

describe('TrustBadge', () => {
  it.each([
    ['TRUSTED', 4.4, 'Skor kepercayaan 4,4, Terpercaya'],
    ['NONE', 3.2, 'Skor kepercayaan 3,2'],
    ['CAUTION', 2.3, 'Skor kepercayaan 2,3, Perlu Waspada'],
    ['NEW', 3, 'Baru'],
    ['INACTIVE', 4, 'Tidak Aktif'],
  ])('label %s', (label, score, description) => {
    render(<TrustBadge label={label} score={score} />);

    const badge = screen.getByLabelText(description);
    expect(badge).toHaveAttribute('title', 'Dihitung otomatis dari rating dan kecepatan tanggap');
  });

  it('tampil bersama OfficialBadge dengan keterangan berbeda', () => {
    render(
      <div>
        <OfficialBadge />
        <TrustBadge label="TRUSTED" score={4.4} />
      </div>,
    );

    expect(screen.getByLabelText('Official')).toHaveAttribute(
      'title',
      'Diverifikasi manual oleh Admin Board',
    );
    expect(screen.getByLabelText('Skor kepercayaan 4,4, Terpercaya')).not.toHaveAttribute(
      'title',
      'Diverifikasi manual oleh Admin Board',
    );
  });
});

describe('Modal rating', () => {
  it('menampilkan alasan jika belum boleh memberi rating', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /boards/kampus-its': () => [200, { data: boardDetail() }],
      'GET /boards/kampus-its/ratings/summary': () => [200, { data: summary }],
      'GET /boards/kampus-its/rating/me': () => [
        200,
        {
          data: {
            rating: null,
            canRate: false,
            reasonCode: 'NOT_FOLLOWING',
            reason: 'Ikuti Board ini dulu untuk memberi rating',
          },
        },
      ],
    });
    renderApp('/b/kampus-its');

    await userEvent.click(await screen.findByRole('button', { name: 'Beri Rating' }));

    const dialog = await screen.findByRole('dialog');
    expect(
      await within(dialog).findByText('Ikuti Board ini dulu untuk memberi rating'),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Kirim Rating' })).not.toBeInTheDocument();
  });

  it('mengirim bintang dan pilihan cepat', async () => {
    let body;
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /boards/kampus-its': () => [200, { data: boardDetail() }],
      'GET /boards/kampus-its/ratings/summary': () => [200, { data: summary }],
      'GET /boards/kampus-its/rating/me': () => [
        200,
        { data: { rating: null, canRate: true, reasonCode: null, reason: null } },
      ],
      'PUT /boards/kampus-its/rating': (options) => {
        body = JSON.parse(options.body);
        return [200, { data: { rating: body, board: {} } }];
      },
    });
    renderApp('/b/kampus-its');

    await userEvent.click(await screen.findByRole('button', { name: 'Beri Rating' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(await within(dialog).findByRole('button', { name: '4 bintang' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /Tanggap/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kirim Rating' }));

    await waitFor(() => expect(body).toEqual({ stars: 4, quickTag: 'RESPONSIVE' }));
  });
});

describe('Dashboard Verifikasi', () => {
  it('selain Admin Board diarahkan ke Beranda', async () => {
    mockApi({ 'GET /auth/me': () => [200, { data: { ...user, role: 'ADMIN' } }] });
    const { router } = renderApp('/verifikasi');

    expect(
      await screen.findByText('Dashboard Verifikasi hanya untuk Admin Board.'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('menampilkan kandidat dan statistik', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: verifier }],
      'GET /board-admin/stats': () => [
        200,
        { data: { candidates: 1, official: 3, revokedLast30Days: 0, needsReview: 1 } },
      ],
      'GET /board-admin/candidates': () => [
        200,
        {
          data: [verificationDetail()],
          meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      ],
    });
    renderApp('/verifikasi');

    expect(await screen.findByRole('link', { name: 'Kampus ITS' })).toHaveAttribute(
      'href',
      '/verifikasi/kampus-its',
    );
    expect(screen.getByText('Kandidat Official').nextSibling).toHaveTextContent('1');
  });

  it('Jadikan Official mengirim catatan dan menampilkan peringatan syarat', async () => {
    let body;
    mockApi({
      'GET /auth/me': () => [200, { data: verifier }],
      'GET /board-admin/boards/kampus-its': () => [200, { data: verificationDetail() }],
      'POST /board-admin/boards/kampus-its/verify': (options) => {
        body = JSON.parse(options.body);
        return [200, { data: { slug: 'kampus-its', verification: 'OFFICIAL', warnings: [] } }];
      },
    });
    renderApp('/verifikasi/kampus-its');

    await userEvent.click(await screen.findByRole('button', { name: 'Jadikan Official' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Umur Board minimal 30 hari')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Jadikan Official' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Catatan wajib diisi');
    await userEvent.type(within(dialog).getByLabelText('Catatan keputusan'), 'Pengelola resmi');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Jadikan Official' }));

    await waitFor(() => expect(body).toEqual({ note: 'Pengelola resmi' }));
    expect(await screen.findByText('Kampus ITS sekarang Official')).toBeInTheDocument();
  });

  it('Cabut Official menolak alasan kosong', async () => {
    let called = false;
    mockApi({
      'GET /auth/me': () => [200, { data: verifier }],
      'GET /board-admin/boards/kampus-its': () => [
        200,
        { data: verificationDetail({ verification: 'OFFICIAL' }) },
      ],
      'POST /board-admin/boards/kampus-its/revoke': () => {
        called = true;
        return [200, { data: {} }];
      },
    });
    renderApp('/verifikasi/kampus-its');

    await userEvent.click(await screen.findByRole('button', { name: 'Cabut Official' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cabut Official' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Alasan wajib diisi');
    await userEvent.type(within(dialog).getByLabelText('Alasan pencabutan'), 'palsu');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cabut Official' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Alasan minimal 10 karakter');
    expect(called).toBe(false);
  });
});
