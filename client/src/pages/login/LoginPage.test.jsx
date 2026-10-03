import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guestMe, mockApi, renderApp } from '../../test/renderApp.jsx';

const user = {
  id: 1,
  name: 'Budi Santoso',
  email: 'budi@example.com',
  avatarUrl: null,
  role: 'USER',
  hasPassword: true,
  needsOnboarding: true,
  createdAt: '2026-10-03T00:00:00.000Z',
};

async function fillAndSubmit(email, password) {
  const actor = userEvent.setup();
  if (email) await actor.type(await screen.findByLabelText('Email'), email);
  if (password) await actor.type(screen.getByLabelText('Password'), password);
  await actor.click(await screen.findByRole('button', { name: 'Masuk' }));
}

describe('Halaman Masuk', () => {
  it('menampilkan error validasi saat form kosong tanpa memanggil server', async () => {
    const fetchMock = mockApi({ 'GET /auth/me': guestMe });
    renderApp('/masuk');

    await fillAndSubmit();

    expect(await screen.findByText('Email wajib diisi')).toBeInTheDocument();
    expect(screen.getByText('Password wajib diisi')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Email wajib diisi');
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/login')).toBe(false);
  });

  it('menampilkan pesan error dari server', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'POST /auth/login': () => [
        401,
        {
          error: { code: 'INVALID_CREDENTIALS', message: 'Email atau password salah', details: [] },
        },
      ],
    });
    renderApp('/masuk');

    await fillAndSubmit('budi@example.com', 'salah1234');

    expect(await screen.findByRole('alert')).toHaveTextContent('Email atau password salah');
  });

  it('menampilkan error per field dari server di bawah field yang sesuai', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'POST /auth/login': () => [
        400,
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Data yang dikirim tidak valid',
            details: [{ field: 'email', message: 'Format email ditolak server' }],
          },
        },
      ],
    });
    renderApp('/masuk');

    await fillAndSubmit('budi@example.com', 'rahasia123');

    expect(await screen.findByLabelText('Email')).toHaveAccessibleDescription(
      'Format email ditolak server',
    );
  });

  it('menonjolkan tombol Google untuk error USE_GOOGLE_LOGIN', async () => {
    mockApi({
      'GET /auth/me': guestMe,
      'POST /auth/login': () => [
        401,
        {
          error: {
            code: 'USE_GOOGLE_LOGIN',
            message: 'Akun ini terdaftar lewat Google. Silakan masuk dengan Google.',
            details: [],
          },
        },
      ],
    });
    renderApp('/masuk?returnTo=%2Fprofil');

    await fillAndSubmit('budi@example.com', 'rahasia123');

    expect(await screen.findByRole('alert')).toHaveTextContent('terdaftar lewat Google');
    const google = screen.getByRole('link', { name: /Masuk dengan Google/ });
    expect(google).toHaveAttribute('data-highlighted', 'true');
    expect(google).toHaveAttribute('href', '/api/auth/google?returnTo=%2Fprofil');
  });

  it('menampilkan pesan saat login Google gagal', async () => {
    mockApi({ 'GET /auth/me': guestMe });
    renderApp('/masuk?error=google');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Login Google gagal atau dibatalkan.',
    );
  });

  it('mengarahkan ke returnTo yang aman setelah berhasil masuk', async () => {
    mockApi({ 'GET /auth/me': guestMe, 'POST /auth/login': () => [200, { data: user }] });
    const { router } = renderApp('/masuk?returnTo=%2Fprofil');

    await fillAndSubmit('budi@example.com', 'rahasia123');

    await waitFor(() => expect(router.state.location.pathname).toBe('/profil'));
  });

  it('mengabaikan returnTo ke situs lain', async () => {
    mockApi({ 'GET /auth/me': guestMe, 'POST /auth/login': () => [200, { data: user }] });
    const { router } = renderApp('/masuk?returnTo=%2F%2Fevil.com');

    await fillAndSubmit('budi@example.com', 'rahasia123');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('langsung mengarahkan user yang sudah login ke Beranda', async () => {
    mockApi({ 'GET /auth/me': () => [200, { data: user }] });
    const { router } = renderApp('/masuk');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
