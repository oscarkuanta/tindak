import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from '../../test/renderApp.jsx';

describe('Halaman laporan terkirim', () => {
  it('menampilkan kode lacak yang diberikan setelah submit', async () => {
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
  });
});
