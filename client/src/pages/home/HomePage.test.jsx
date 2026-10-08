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

  it('tamu tanpa kota melihat laporan Ramai dan ajakan memilih kota di panel kanan', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'GET /feed/home': () => page([card(1, 'Lubang di Official', 'OFFICIAL')]),
    });
    renderApp('/');

    expect(await screen.findByText('Lubang di Official')).toBeInTheDocument();
    const panel = screen.getByRole('heading', { name: 'Board di Sekitarmu' }).closest('div');
    expect(
      within(panel).getByText('Pilih kotamu di Beranda supaya Board terdekat muncul di sini.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('SMKN 1 Surabaya')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Diikuti' })).not.toBeInTheDocument();
  });

  it('kota bisa diganti dengan mengetik ulang dan panel kanan hanya berisi Board kota itu', async () => {
    localStorage.setItem('tindak:kota', 'Kota Surabaya');
    const searchUrls = [];
    mockApi({
      'GET /auth/me': guestMe,
      'GET /meta/cities': () => [
        200,
        {
          data: [
            { name: 'Kota Surabaya', province: 'Jawa Timur' },
            { name: 'Kabupaten Aceh Besar', province: 'Aceh' },
          ],
        },
      ],
      'GET /boards/search': () => {
        const empty = searchUrls.length > 0;
        searchUrls.push('search');
        return [
          200,
          {
            data: empty ? [] : popular.data,
            meta: { page: 1, pageSize: 6, total: empty ? 0 : 1, totalPages: empty ? 0 : 1 },
          },
        ];
      },
      'GET /feed/home': () => page([card(1, 'Laporan sekitar')]),
    });
    renderApp('/');

    const panel = (await screen.findByRole('heading', { name: 'Board di Sekitarmu' })).closest(
      'div',
    );
    expect(await within(panel).findByText('SMKN 1 Surabaya')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ganti kota' }));
    const input = screen.getByRole('combobox', { name: 'Kotamu' });
    expect(input).toHaveValue('Kota Surabaya');
    await userEvent.clear(input);
    await userEvent.type(input, 'aceh');
    expect(input).toHaveValue('aceh');
    await userEvent.click(await screen.findByRole('option', { name: /Kabupaten Aceh Besar/ }));

    expect(
      await within(panel).findByText('Belum ada Board di Kabupaten Aceh Besar.'),
    ).toBeInTheDocument();
    expect(within(panel).queryByText('SMKN 1 Surabaya')).not.toBeInTheDocument();
    expect(localStorage.getItem('tindak:kota')).toBe('Kabupaten Aceh Besar');
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
    expect(screen.getByRole('heading', { name: 'Board di Sekitarmu' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Ramai' }));

    expect(screen.getByRole('tab', { name: 'Ramai' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Laporan 2')).toBeInTheDocument();
  });
});
