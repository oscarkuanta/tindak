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
      'POST /boards/jalan-melati/handlers': (options) => {
        expect(JSON.parse(options.body)).toEqual({ email: 'dewi@example.com' });
        return [201, { data: { userId: 9, status: 'INVITED' } }];
      },
    });
    renderForm();

    await user.type(
      screen.getByRole('textbox', { name: 'Email akun yang akan diundang' }),
      'salah',
    );
    await user.click(screen.getByRole('button', { name: 'Undang Penindak' }));
    expect(await screen.findByText('Format email tidak valid')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    const emailInput = screen.getByRole('textbox', { name: 'Email akun yang akan diundang' });
    await user.clear(emailInput);
    await user.type(emailInput, 'DEWI@EXAMPLE.COM');
    await user.click(screen.getByRole('button', { name: 'Undang Penindak' }));

    expect(await screen.findByText('Undangan Penindak berhasil dikirim.')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
