import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

describe('Kebijakan Privasi', () => {
  it('bisa dibuka tamu di /privasi', async () => {
    mockApi({ 'GET /auth/me': guestMe });
    renderApp('/privasi');

    expect(
      await screen.findByRole('heading', { name: 'Kebijakan Privasi T!ndak' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Data yang kami simpan' })).toBeInTheDocument();
  });
});
