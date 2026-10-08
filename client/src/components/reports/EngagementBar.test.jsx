import { afterEach, describe, expect, it } from 'vitest';
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
    supportCount: 4,
    reactionCounts: { DANGEROUS: 2, LONG_STANDING: 1, ANNOYING: 0 },
    mySupport: false,
    myReaction: null,
    isEngagementLocked: false,
    isOwnReport: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function engagement(overrides = {}) {
  return {
    reportId: 7,
    supportCount: 5,
    reactionCounts: { DANGEROUS: 2, LONG_STANDING: 1, ANNOYING: 0 },
    mySupport: true,
    myReaction: null,
    priorityScore: 40,
    ...overrides,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const supportButton = () => screen.findByRole('button', { name: /Dukung,/ });

afterEach(() => {
  sessionStorage.clear();
});

describe('EngagementBar', () => {
  it('menaikkan jumlah dukungan seketika lalu memakai data server', async () => {
    const gate = deferred();
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /reports/7': () => [200, { data: report() }],
      'PUT /reports/7/support': async () => {
        await gate.promise;
        return [200, { data: engagement() }];
      },
    });
    renderApp('/laporan/7');

    await userEvent.click(await supportButton());

    expect(await screen.findByRole('button', { name: 'Dukung, 5 dukungan' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    gate.resolve();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Dukung, 5 dukungan' })).toBeEnabled(),
    );
  });

  it('mengembalikan jumlah dan menampilkan pesan jika server menolak', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /reports/7': () => [200, { data: report() }],
      'PUT /reports/7/support': () => [
        409,
        { error: { code: 'REPORT_LOCKED', message: 'Laporan sudah ditutup', details: [] } },
      ],
    });
    renderApp('/laporan/7');

    await userEvent.click(await supportButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Laporan sudah ditutup');
    expect(screen.getByRole('button', { name: 'Dukung, 4 dukungan' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('popover reaksi: pilih, ganti tampilan tombol, dan klik lagi untuk batal', async () => {
    const calls = [];
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /reports/7': () => [200, { data: report() }],
      'PUT /reports/7/reaction': (options) => {
        calls.push(['PUT', JSON.parse(options.body).type]);
        return [
          200,
          {
            data: engagement({
              mySupport: false,
              supportCount: 4,
              myReaction: 'DANGEROUS',
              reactionCounts: { DANGEROUS: 3, LONG_STANDING: 1, ANNOYING: 0 },
            }),
          },
        ];
      },
      'DELETE /reports/7/reaction': () => {
        calls.push(['DELETE']);
        return [200, { data: engagement({ mySupport: false, supportCount: 4 }) }];
      },
    });
    renderApp('/laporan/7');

    const group = await screen.findByRole('group', { name: 'Reaksi' });
    const dangerous = within(group).getByRole('button', { name: 'Berbahaya, 2 reaksi' });
    expect(dangerous).toHaveAttribute('title', 'Berbahaya: Bisa melukai orang');
    expect(within(group).getByRole('button', { name: 'Sudah Lama, 1 reaksi' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(dangerous.textContent).not.toMatch(/\p{Extended_Pictographic}/u);

    await userEvent.click(dangerous);

    const chosen = await within(group).findByRole('button', { name: 'Berbahaya, 3 reaksi' });
    expect(chosen).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Mengganggu, 0 reaksi' })).toBeInTheDocument();

    await userEvent.click(chosen);

    await waitFor(() => expect(calls).toEqual([['PUT', 'DANGEROUS'], ['DELETE']]));
    expect(
      await within(group).findByRole('button', { name: 'Berbahaya, 2 reaksi' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('menonaktifkan tombol dengan alasan saat laporan terkunci atau milik sendiri', async () => {
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /reports/7': () => [200, { data: report({ isEngagementLocked: true }) }],
    });
    renderApp('/laporan/7');

    const button = await supportButton();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Laporan sudah ditutup, dukungan dan reaksi dikunci');
    for (const reaction of within(screen.getByRole('group', { name: 'Reaksi' })).getAllByRole(
      'button',
    )) {
      expect(reaction).toBeDisabled();
    }
  });

  it('tamu diminta masuk dan aksinya disimpan', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'GET /reports/7': () => [200, { data: report() }],
    });
    renderApp('/laporan/7');

    await userEvent.click(await supportButton());

    expect(await screen.findByText('Masuk untuk mendukung laporan ini')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('tindak.pendingEngagement'))).toMatchObject({
      reportId: 7,
      action: 'support',
    });
  });

  it('menjalankan aksi tertunda sekali setelah login', async () => {
    sessionStorage.setItem(
      'tindak.pendingEngagement',
      JSON.stringify({ reportId: 7, action: 'support', savedAt: Date.now() }),
    );
    let supportCalls = 0;
    mockApi({
      'GET /auth/me': () => [200, { data: user }],
      'GET /reports/7': () => [200, { data: report() }],
      'PUT /reports/7/support': () => {
        supportCalls += 1;
        return [200, { data: engagement() }];
      },
    });
    renderApp('/laporan/7');

    expect(await screen.findByRole('button', { name: 'Dukung, 5 dukungan' })).toBeInTheDocument();
    await waitFor(() => expect(supportCalls).toBe(1));
    expect(sessionStorage.getItem('tindak.pendingEngagement')).toBeNull();
  });
});
