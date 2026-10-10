import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

describe('Halaman laporan terkirim', () => {
  it('menampilkan kode lacak yang diberikan setelah submit', async () => {
    mockApi({ 'GET /auth/me': guestMe });
    const { router } = renderApp('/');
    await router.navigate('/laporan-terkirim', {
      state: {
        trackingCode: 'TND-K7M2P9QX',
        trackingUrl: 'https://tindak.id/lacak/K7M2P9QX?secret=secret-value',
        secret: 'secret-value',
      },
    });

    expect(await screen.findByText('TND-K7M2P9QX')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Simpan Kode Lacak' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Kenapa kamu mendapat Kode Lacak?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Kamu melapor tanpa masuk akun/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Daftar akun gratis' })).toHaveAttribute(
      'href',
      '/daftar',
    );
  });
});

describe('Halaman laporan terkirim untuk akun', () => {
  it('tidak menampilkan penjelasan tamu dan ajakan daftar', async () => {
    mockApi({
      'GET /auth/me': () => [
        200,
        { data: { id: 3, name: 'Siti', email: 's@x.com', role: 'USER' } },
      ],
    });
    const { router } = renderApp('/lacak');
    await router.navigate('/laporan-terkirim', {
      state: { trackingCode: 'TND-K7M2P9QX', reportId: 9, reportTitle: 'Lampu mati' },
    });

    expect(await screen.findByRole('heading', { name: 'Laporan berhasil dikirim' })).toBeVisible();
    expect(screen.getByText(/tersimpan di akunmu/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buka Laporan Saya' })).toHaveAttribute(
      'href',
      '/laporan-saya',
    );
    expect(screen.queryByText('Kenapa kamu mendapat Kode Lacak?')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Daftar akun gratis' })).not.toBeInTheDocument();
  });
});
