import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { mockApi, renderApp } from '../../test/renderApp.jsx';

const stats = {
  range: '30d',
  since: '2026-09-07T08:00:00.000Z',
  generatedAt: '2026-10-07T08:00:00.000Z',
  totals: { total: 6, active: 4, resolved: 1, rejected: 1 },
  statusCounts: {
    NEW: 2,
    NEED_INFO: 0,
    IN_PROGRESS: 0,
    AWAITING_CONFIRMATION: 2,
    RESOLVED: 1,
    REOPENED: 0,
    REJECTED: 1,
    DUPLICATE: 0,
  },
  handling: { handledCount: 3, averageHours: 30 },
  responseRate: 75,
  dangerous: {
    total: 3,
    onTime: 1,
    late: 2,
    onTimeRate: 33,
    lateReports: [
      {
        id: 15,
        title: 'Kabel listrik putus',
        status: 'AWAITING_CONFIRMATION',
        createdAt: '2026-09-22T08:00:00.000Z',
        dueAt: '2026-09-24T08:00:00.000Z',
        markedResolvedAt: '2026-09-24T20:00:00.000Z',
        lateHours: 12,
      },
    ],
  },
  categories: [{ id: 10, name: 'Jalan Berlubang', count: 4 }],
  weeklyTrend: [{ weekStart: '2026-09-07', incoming: 1, resolved: 0 }],
  oldestActive: [
    {
      id: 16,
      title: 'Lampu jalan mati',
      status: 'NEW',
      severity: 'LOW',
      createdAt: '2026-08-28T08:00:00.000Z',
      dueAt: null,
      category: { id: 11, name: 'Lampu Jalan' },
      ageDays: 40,
    },
  ],
  handlers: [
    {
      userId: 6,
      name: 'Siti Aminah',
      role: 'HANDLER',
      processed: 2,
      resolved: 2,
      averageHours: 35,
    },
  ],
  rating: {
    trustScore: 3.3,
    trustLabel: 'NEW',
    ratingCount: 2,
    averageStars: 4,
    responseRate: null,
    rejectedPercentage: 17,
    distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
    quickTags: { RESPONSIVE: 0, SLOW: 0, DOUBTFUL: 0 },
    newRatings: 2,
  },
};

function baseHandlers(statsResponse = stats) {
  return {
    'GET /auth/me': () => [200, { data: { id: 6, name: 'Siti Aminah', role: 'USER' } }],
    'GET /boards/jalan-ahmad-yani/stats': () => [200, { data: statsResponse }],
  };
}

describe('Dashboard statistik Board', () => {
  it('menampilkan kartu angka dan ringkasan rating dari respons API', async () => {
    mockApi(baseHandlers());
    renderApp('/b/jalan-ahmad-yani/dashboard');

    expect(await screen.findByTestId('stat-Total laporan')).toHaveTextContent('6');
    expect(screen.getByTestId('stat-Laporan aktif')).toHaveTextContent('4');
    expect(screen.getByTestId('stat-Laporan selesai')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-Rata-rata waktu penanganan')).toHaveTextContent('30 jam');
    expect(screen.getByTestId('stat-Tingkat tanggap')).toHaveTextContent('75%');
    expect(screen.getByTestId('stat-Berbahaya tepat waktu')).toHaveTextContent('33%');
    expect(screen.getByRole('heading', { name: 'Ringkasan rating' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Sebaran bintang' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ekspor CSV' })).toHaveAttribute(
      'href',
      '/api/boards/jalan-ahmad-yani/export?format=csv&range=30d',
    );
  });

  it('tidak menampilkan tabel kinerja untuk Penindak saat handlers null', async () => {
    mockApi(baseHandlers({ ...stats, handlers: null }));
    renderApp('/b/jalan-ahmad-yani/dashboard');

    expect(await screen.findByTestId('stat-Total laporan')).toHaveTextContent('6');
    expect(screen.queryByRole('heading', { name: 'Kinerja Penindak' })).not.toBeInTheDocument();
  });

  it('meminta data baru ketika rentang waktu diganti', async () => {
    const fetchMock = mockApi(baseHandlers());
    renderApp('/b/jalan-ahmad-yani/dashboard');

    await screen.findByTestId('stat-Total laporan');
    fireEvent.change(screen.getByRole('combobox', { name: 'Rentang waktu statistik' }), {
      target: { value: '7d' },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/boards/jalan-ahmad-yani/stats?range=7d',
        expect.any(Object),
      );
    });
  });

  it('menampilkan 403 ketika statistik ditolak untuk user yang bukan Penindak Board', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: { id: 20, name: 'Rudi Hartono', role: 'USER' } }],
      'GET /boards/jalan-ahmad-yani/stats': () => [
        403,
        { error: { code: 'FORBIDDEN', message: 'Kamu bukan Penindak Board ini.' } },
      ],
    });
    renderApp('/b/jalan-ahmad-yani/dashboard');

    expect(await screen.findByRole('heading', { name: 'Akses ditolak' })).toBeInTheDocument();
    expect(screen.getByText('403')).toBeInTheDocument();
  });
});
