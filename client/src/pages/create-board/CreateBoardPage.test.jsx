import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderApp } from '../../test/renderApp.jsx';

const owner = {
  id: 1,
  name: 'Budi Santoso',
  email: 'budi@example.com',
  avatarUrl: null,
  role: 'USER',
  hasPassword: true,
  needsOnboarding: false,
  createdAt: '2026-10-03T00:00:00.000Z',
};

const cityList = { data: [{ name: 'Surabaya', province: 'Jawa Timur' }] };

function setup(overrides = {}) {
  const handlers = {
    'GET /auth/me': () => [200, { data: owner }],
    'GET /meta/cities': () => [200, cityList],
    'GET /boards/similar': () => [200, { data: [] }],
    ...overrides,
  };
  return { fetchMock: mockApi(handlers), ...renderApp('/buat-board') };
}

async function fillIdentity(user) {
  await user.type(await screen.findByLabelText('Nama Board'), 'Jalan Rungkut Madya');
  await user.click(screen.getByRole('combobox', { name: 'Kota' }));
  await user.click(await screen.findByText('Surabaya'));
  await user.click(screen.getByRole('button', { name: /Jalan/ }));
}

describe('Buat Board', () => {
  it('memvalidasi langkah identitas dan mempertahankan nilai saat kembali', async () => {
    setup();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Lanjut' }));
    expect(await screen.findByText('Nama Board minimal 3 karakter')).toBeInTheDocument();
    expect(screen.getByText('Kota wajib dipilih')).toBeInTheDocument();
    expect(screen.getByText('Jenis Board wajib dipilih')).toBeInTheDocument();

    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(await screen.findByRole('heading', { name: 'Tentang Board' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/status pengelola/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Board baru berstatus Komunitas/)).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Deskripsi dan cakupan'),
      'Melayani laporan di sepanjang jalan ini.',
    );
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(await screen.findByRole('heading', { name: 'Pengaturan' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kembali' }));

    expect(await screen.findByRole('heading', { name: 'Tentang Board' })).toBeInTheDocument();
    expect(screen.getByLabelText('Deskripsi dan cakupan')).toHaveValue(
      'Melayani laporan di sepanjang jalan ini.',
    );
  });

  it('menampilkan peringatan Board serupa dengan badge verifikasi', async () => {
    setup({
      'GET /boards/similar': () => [
        200,
        {
          data: [
            {
              id: 12,
              slug: 'jalan-rungkut',
              name: 'Jalan Rungkut',
              city: 'Surabaya',
              type: 'ROAD',
              verification: 'OFFICIAL',
              trustLabel: 'TRUSTED',
              followerCount: 20,
              activeReportCount: 3,
            },
          ],
        },
      ],
    });
    const user = userEvent.setup();
    await fillIdentity(user);

    expect(
      await screen.findByText('Board serupa sudah ada', {}, { timeout: 2500 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Jalan Rungkut Official/ })).toBeInTheDocument();
    expect(screen.getByText(/Kamu tetap boleh membuat Board baru/)).toBeInTheDocument();
  });

  it('membuat Board lalu membuka halaman detail dan menampilkan toast sukses', async () => {
    const createdBoard = {
      id: 42,
      slug: 'jalan-rungkut-madya-surabaya',
      name: 'Jalan Rungkut Madya',
      city: 'Surabaya',
      type: 'ROAD',
      verification: 'COMMUNITY',
      coverImageUrl: null,
      managerTitle: null,
      description: 'Melayani laporan di sepanjang jalan ini.',
      dangerousTargetHours: 48,
      verifiedAt: null,
      ratingCount: 0,
      responseRate: 0,
      rejectedPercentage: 0,
      handlerCount: 1,
      isInactive: false,
      createdAt: '2026-10-04T00:00:00.000Z',
      categories: [],
      viewer: { isFollowing: false, role: 'OWNER' },
    };
    setup({
      'POST /boards': async (options) => {
        const body = JSON.parse(options.body);
        expect(body.name).toBe('Jalan Rungkut Madya');
        expect(body.extraCategories).toEqual([]);
        return [201, { data: createdBoard }];
      },
      'GET /boards/jalan-rungkut-madya-surabaya': () => [200, { data: createdBoard }],
    });
    const user = userEvent.setup();
    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    await user.type(screen.getByLabelText('Deskripsi dan cakupan'), createdBoard.description);
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    await user.click(screen.getByRole('button', { name: 'Buat Board' }));

    expect(await screen.findByRole('heading', { name: 'Jalan Rungkut Madya' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Board berhasil dibuat'),
    );
  });

  it('menampilkan tautan Board Saya untuk BOARD_LIMIT_REACHED', async () => {
    setup({
      'POST /boards': () => [
        403,
        { error: { code: 'BOARD_LIMIT_REACHED', message: 'Batas tercapai', details: [] } },
      ],
    });
    const user = userEvent.setup();
    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    await user.type(
      screen.getByLabelText('Deskripsi dan cakupan'),
      'Melayani laporan di sepanjang jalan ini.',
    );
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    await user.click(screen.getByRole('button', { name: 'Buat Board' }));

    expect(
      await screen.findByText('Kamu sudah mencapai batas 3 Board yang dibuat.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buka Board Saya' })).toHaveAttribute(
      'href',
      '/board-saya',
    );
  });
});
