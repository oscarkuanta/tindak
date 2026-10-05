import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HandlerActionPanel } from './HandlerActionPanel.jsx';

function renderPanel(report, onAction = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    onAction,
    ...render(
      <QueryClientProvider client={queryClient}>
        <HandlerActionPanel report={report} onAction={onAction} />
      </QueryClientProvider>,
    ),
  };
}

function getRejectButton() {
  return screen.getAllByRole('button', { name: 'Tolak laporan' }).at(-1);
}

describe('HandlerActionPanel', () => {
  it('menampilkan tombol sesuai allowedActions dari server', () => {
    renderPanel({ id: 4, allowedActions: ['PROCESS'] });

    expect(screen.getByRole('button', { name: 'Proses laporan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Minta Info' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tolak laporan' })).not.toBeInTheDocument();
  });

  it('mewajibkan catatan saat alasan penolakan adalah Lainnya', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue({});
    renderPanel({ id: 4, allowedActions: ['REJECT'] }, onAction);

    await user.click(getRejectButton());
    await user.selectOptions(screen.getByLabelText('Alasan penolakan'), 'OTHER');
    await user.click(getRejectButton());

    expect(await screen.findByText('Catatan wajib diisi untuk alasan Lainnya')).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Catatan/), 'Lokasi di luar wilayah Board.');
    await user.click(getRejectButton());

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith('REJECT', {
        reason: 'OTHER',
        note: 'Lokasi di luar wilayah Board.',
      });
    });
  });
});
