import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('HandlerActionPanel penanggung jawab', () => {
  it('memuat Penindak Utama dan Penindak aktif tanpa duplikat', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <HandlerActionPanel
          report={{
            id: 4,
            allowedActions: ['PROCESS'],
            board: { slug: 'b', owner: { id: 1, name: 'Budi' } },
          }}
          handlers={[
            { userId: 1, status: 'ACTIVE', user: { name: 'Budi' } },
            { userId: 2, status: 'ACTIVE', user: { name: 'Siti' } },
            { userId: 3, status: 'INVITED', user: { name: 'Dewi' } },
          ]}
          onAction={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Pilih penanggung jawab', 'Budi (Penindak Utama)', 'Siti']);
  });
});

describe('HandlerActionPanel validasi', () => {
  const board = { slug: 'b', owner: { id: 1, name: 'Budi' } };

  it('tombol Proses nonaktif sampai penanggung jawab dipilih', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue({});
    renderPanel({ id: 4, allowedActions: ['PROCESS'], board }, onAction);

    const processButton = screen.getByRole('button', { name: 'Proses laporan' });
    expect(processButton).toBeDisabled();
    expect(screen.getByText('Wajib dipilih sebelum laporan bisa diproses.')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Penanggung jawab'), '1');
    expect(processButton).toBeEnabled();
    await user.click(processButton);

    await waitFor(() => expect(onAction).toHaveBeenCalledWith('PROCESS', { assigneeId: 1 }));
  });

  it('Tandai Selesai menampilkan error di kolom catatan dan foto ditambahkan, bukan diganti', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue({});
    renderPanel({ id: 4, allowedActions: ['RESOLVE'], board }, onAction);

    await user.click(screen.getByRole('button', { name: 'Tandai Selesai' }));
    await user.click(screen.getByRole('button', { name: 'Kirim bukti dan tandai selesai' }));

    const noteField = screen.getByLabelText('Catatan penyelesaian');
    expect(await screen.findByText('Catatan wajib diisi')).toBeInTheDocument();
    expect(noteField).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Unggah minimal 1 foto sesudah')).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();

    const upload = screen.getByLabelText('Unggah foto sesudah');
    const photo = (name) => new File(['x'], name, { type: 'image/png' });
    fireEvent.change(upload, { target: { files: [photo('a.png')] } });
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^Hapus foto/ })).toHaveLength(1),
    );
    fireEvent.change(upload, { target: { files: [photo('b.png'), photo('c.png')] } });
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^Hapus foto/ })).toHaveLength(3),
    );

    await user.type(noteField, 'Lubang sudah ditambal.');
    await user.click(screen.getByRole('button', { name: 'Kirim bukti dan tandai selesai' }));

    await waitFor(() => expect(onAction).toHaveBeenCalledWith('RESOLVE', expect.any(FormData)));
    expect(onAction.mock.calls[0][1].getAll('photos')).toHaveLength(3);
  });
});
