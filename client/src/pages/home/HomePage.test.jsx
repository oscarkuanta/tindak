import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

const card = (id, title, verification = 'COMMUNITY') => ({
  id,
  title,
  description: 'Deskripsi',
  locationDetail: 'Lokasi',
  severity: 'LOW',
  status: 'NEW',
  board: { id: 1, slug: 'board-a', name: 'Board A', status: 'ACTIVE', verification },
  category: { id: 1, name: 'Kebersihan' },
  media: [],
  supportCount: 1,
  reactionCounts: { DANGEROUS: 0, LONG_STANDING: 0, ANNOYING: 0 },
  mySupport: false,
  myReaction: null,
  isEngagementLocked: false,
  isOwnReport: false,
  createdAt: '2026-10-01T00:00:00.000Z',
});

const page = (data) => [
  200,
  { data, meta: { page: 1, pageSize: 10, total: data.length, totalPages: 1 } },
];

const popular = {
  data: [
    {
      id: 1,
      slug: 'smkn-1',
      name: 'SMKN 1 Surabaya',
      city: 'Kota Surabaya',
      verification: 'OFFICIAL',
      followerCount: 12,
      activeReportCount: 3,
    },
  ],
};

afterEach(() => {
  localStorage.clear();
});

describe('Beranda', () => {
  it('tamu memilih kota lalu melihat laporan di sekitarnya', async () => {
    const urls = [];
    const fetchMock = mockApi({
      'GET /auth/me': guestMe,
      'GET /boards/popular': () => [200, popular],
      'GET /meta/cities': () => [
        200,
        { data: [{ name: 'Kota Surabaya', province: 'Jawa Timur' }] },
      ],
      'GET /feed/home': () => {
        const tab = urls.length === 0 ? 'Ramai' : 'Surabaya';
        urls.push(tab);
        return page([card(urls.length, `Laporan ${tab}`)]);
      },
    });
    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: 'Di kota mana kamu tinggal?' }),
    ).toBeVisible();
    expect(await screen.findByText('Laporan Ramai')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Kotamu' }));
    await userEvent.click(await screen.findByRole('option', { name: /Kota Surabaya/ }));

    expect(await screen.findByText('Laporan Surabaya')).toBeInTheDocument();
    expect(screen.getByText('Kota Surabaya', { selector: 'strong' })).toBeInTheDocument();
    const feedUrls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/feed/home'));
    expect(feedUrls.at(-1)).toContain('tab=nearby');
    expect(feedUrls.at(-1)).toContain(
      `city=${encodeURIComponent('Kota Surabaya').replace(/%20/g, '+')}`,
    );
    expect(localStorage.getItem('tindak:kota')).toBe('Kota Surabaya');
  });

  it('tamu melihat laporan Ramai dan Board populer dengan badge', async () => {
    const calls = [];
    mockApi({
      'GET /auth/me': guestMe,
      'GET /boards/popular': () => [200, popular],
      'GET /feed/home': () => {
        calls.push('feed');
        return page([card(1, 'Lubang di Official', 'OFFICIAL')]);
      },
    });
    renderApp('/');

    expect(await screen.findByText('Lubang di Official')).toBeInTheDocument();
    const boards = await screen.findByRole('heading', { name: 'Board Populer' });
    const section = boards.closest('div');
    expect(within(section).getByText('SMKN 1 Surabaya')).toBeInTheDocument();
    expect(within(section).getByLabelText('Official')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Diikuti' })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Official').length).toBeGreaterThan(1);
  });

  it('user dengan Board diikuti melihat tab Diikuti dan Ramai', async () => {
    const requested = [];
    mockApi({
      'GET /auth/me': () => [200, { data: { id: 1, name: 'Budi', email: 'b@x.com' } }],
      'GET /me/follows': () => [
        200,
        { data: [{ board: { id: 1, slug: 'board-a', name: 'Board A' } }] },
      ],
      'GET /feed/home': (options) => {
        requested.push(options);
        return page([card(requested.length, `Laporan ${requested.length}`)]);
      },
    });
    renderApp('/');

    expect(await screen.findByRole('tab', { name: 'Diikuti' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('heading', { name: 'Board Populer' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Ramai' }));

    expect(screen.getByRole('tab', { name: 'Ramai' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Laporan 2')).toBeInTheDocument();
  });
});
