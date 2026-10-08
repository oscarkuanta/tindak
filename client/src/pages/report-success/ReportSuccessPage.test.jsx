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
