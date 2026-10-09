import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HandlerInviteForm } from './HandlerManagement.jsx';
import { mockApi } from '../../test/renderApp.jsx';

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HandlerInviteForm slug="jalan-melati" />
    </QueryClientProvider>,
  );
}

describe('HandlerInviteForm', () => {
  it('memvalidasi email dan mengirim undangan untuk akun terdaftar', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      'GET /boards/jalan-melati/handlers/candidates': () => [200, { data: [] }],
      'POST /boards/jalan-melati/handlers': (options) => {
        expect(JSON.parse(options.body)).toEqual({ email: 'dewi@example.com' });
        return [201, { data: { userId: 9, status: 'INVITED' } }];
      },
    });
    renderForm();

    await user.type(
      screen.getByRole('combobox', { name: 'Nama atau email akun yang akan diundang' }),
      'salah@',
    );
    await user.click(screen.getByRole('button', { name: 'Undang Penindak' }));
    expect(await screen.findByText('Format email tidak valid')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);

    const emailInput = screen.getByRole('combobox', {
      name: 'Nama atau email akun yang akan diundang',
    });
    await user.clear(emailInput);
    await user.type(emailInput, 'DEWI@EXAMPLE.COM');
    await user.click(screen.getByRole('button', { name: 'Undang Penindak' }));

    expect(await screen.findByText('Undangan Penindak berhasil dikirim.')).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(
        1,
      ),
    );
  });
  it('memilih akun dari daftar saran lalu mengundang lewat userId', async () => {
    const user = userEvent.setup();
    let body;
    mockApi({
      'GET /boards/jalan-melati/handlers/candidates': () => [
        200,
        {
          data: [
            { id: 7, name: 'Ikanterbang', email: 'ik••••@gmail.com', avatarUrl: null },
            { id: 8, name: 'bukan_Ikanterbang', email: 'ik••••@gmail.com', avatarUrl: null },
          ],
        },
      ],
      'POST /boards/jalan-melati/handlers': (options) => {
        body = JSON.parse(options.body);
        return [201, { data: { userId: 7, status: 'INVITED' } }];
      },
    });
    renderForm();

    await user.type(
      screen.getByRole('combobox', { name: 'Nama atau email akun yang akan diundang' }),
      'ikan',
    );
    await user.click(await screen.findByRole('option', { name: /^Ikanterbang/ }));
    expect(screen.getByText('Akun dipilih: Ikanterbang')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undang Penindak' }));

    expect(await screen.findByText('Undangan Penindak berhasil dikirim.')).toBeInTheDocument();
    expect(body).toEqual({ userId: 7 });
  });

  it('teks yang bukan email dan tidak dipilih dari daftar ditolak', async () => {
    const user = userEvent.setup();
    mockApi({ 'GET /boards/jalan-melati/handlers/candidates': () => [200, { data: [] }] });
    renderForm();

    await user.type(
      screen.getByRole('combobox', { name: 'Nama atau email akun yang akan diundang' }),
      'dewi',
    );
    await user.click(screen.getByRole('button', { name: 'Undang Penindak' }));

    expect(
      await screen.findByText('Pilih akun dari daftar atau ketik email lengkap'),
    ).toBeInTheDocument();
  });
});
