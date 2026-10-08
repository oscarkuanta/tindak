import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

describe('Halaman daftar', () => {
  it('tombol mata menampilkan dan menyembunyikan password', async () => {
    mockApi({ 'GET /auth/me': guestMe });
    renderApp('/daftar');

    const password = await screen.findByLabelText('Password');
    const confirm = screen.getByLabelText('Konfirmasi password');
    await userEvent.type(password, 'Rahasia123');
    expect(password).toHaveAttribute('type', 'password');
    expect(confirm).toHaveAttribute('type', 'password');

    const [showPassword] = screen.getAllByRole('button', { name: 'Tampilkan password' });
    await userEvent.click(showPassword);

    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('Rahasia123');
    expect(confirm).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Sembunyikan password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sembunyikan password' }));
    expect(password).toHaveAttribute('type', 'password');
  });
});
