import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

const user = { id: 9, name: 'Siti', email: 'siti@example.com', avatarUrl: null, role: 'USER' };

function report(overrides = {}) {
  return {
    id: 7,
    title: 'Lubang besar',
    description: 'Lubang selebar satu meter di tengah jalan.',
    locationDetail: 'Depan Indomaret',
    severity: 'DANGEROUS',
    status: 'NEW',
    isAnonymous: true,
    reporter: null,
    board: { id: 1, slug: 'jalan-rungkut', name: 'Jalan Rungkut', status: 'ACTIVE' },
    category: { id: 1, name: 'Jalan Berlubang' },
    media: [],
    timeline: [],
    allowedActions: [],
    supportCount: 0,
    reactionCounts: { DANGEROUS: 0, LONG_STANDING: 0, ANNOYING: 0 },
    mySupport: false,
    myReaction: null,
    isEngagementLocked: false,
    isOwnReport: false,
    isHidden: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

async function openFlagMenu() {
  await userEvent.click(await screen.findByRole('button', { name: 'Opsi laporan' }));
  await userEvent.click(screen.getByRole('menuitem', { name: /Tandai Pelanggaran/ }));
}

describe('Tandai Pelanggaran', () => {
  it('tamu diminta masuk', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'GET /reports/7': () => [200, { data: report() }],
    });
    renderApp('/laporan/7');

    await openFlagMenu();

    expect(
      await screen.findByRole('heading', { name: 'Masuk untuk menandai pelanggaran' }),
    ).toBeInTheDocument();
  });

  it('user memilih alasan lalu mengirim tanda', async () => {
    let body;
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /reports/7': () => [200, { data: report() }],
      'POST /flags': (options) => {
        body = JSON.parse(options.body);
        return [
          201,
          {
            data: { id: 1, targetType: 'REPORT', targetId: 7, reason: 'SPAM', hidden: false },
          },
        ];
      },
    });
    renderApp('/laporan/7');

    await openFlagMenu();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText('Board palsu')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kirim Tanda' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Pilih alasan pelanggaran');

    await userEvent.click(within(dialog).getByLabelText(/Spam\/iklan/));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kirim Tanda' }));

    await waitFor(() =>
      expect(body).toEqual({ targetType: 'REPORT', targetId: 7, reason: 'SPAM' }),
    );
    expect(await screen.findByText(/Tanda kamu akan ditinjau moderator/)).toBeInTheDocument();
  });

  it('menampilkan pesan jika sudah pernah menandai', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /reports/7': () => [200, { data: report() }],
      'POST /flags': () => [
        409,
        { error: { code: 'ALREADY_FLAGGED', message: 'Kamu sudah menandai konten ini' } },
      ],
    });
    renderApp('/laporan/7');

    await openFlagMenu();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByLabelText(/Kekerasan/));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kirim Tanda' }));

    expect(await within(dialog).findByText('Kamu sudah menandai konten ini')).toBeInTheDocument();
  });
});

describe('Moderasi di halaman laporan', () => {
  it('laporan tersembunyi tampil sebagai kartu abu-abu', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'GET /reports/7': () => [
        200,
        {
          data: {
            id: 7,
            board: { slug: 'jalan-rungkut', name: 'Jalan Rungkut' },
            isHidden: true,
            moderationNotice: 'Laporan ini sedang ditinjau moderator',
          },
        },
      ],
    });
    renderApp('/laporan/7');

    expect(
      await screen.findByRole('heading', { name: 'Laporan ini sedang ditinjau moderator' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dukung/ })).not.toBeInTheDocument();
  });

  it('foto buram baru terlihat setelah Tampilkan foto', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'GET /reports/7': () => [
        200,
        {
          data: report({
            media: [{ id: 1, url: '/uploads/a.jpg', kind: 'BEFORE', isBlurred: true }],
          }),
        },
      ],
    });
    renderApp('/laporan/7');

    const image = await screen.findByAltText('Foto diburamkan karena mungkin sensitif');
    expect(image).toHaveClass('blur-xl');
    await userEvent.click(screen.getByRole('button', { name: 'Tampilkan foto' }));

    expect(screen.getByAltText('Foto sebelum penindakan')).not.toHaveClass('blur-xl');
  });
});
