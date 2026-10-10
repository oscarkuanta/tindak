import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { mockApi, guestMe, renderApp } from '../../test/renderApp.jsx';
import { PhotoUploader } from '../../components/reports/PhotoUploader.jsx';

const board = {
  id: 12,
  slug: 'jalan-melati',
  name: 'Jalan Melati',
  city: 'Surabaya',
  type: 'ROAD',
  verification: 'COMMUNITY',
  isInactive: false,
  categories: [{ id: 3, name: 'Jalan Berlubang' }],
  viewer: null,
};

function renderGuestReportForm() {
  mockApi({
    'GET /auth/me': guestMe,
    'GET /boards/jalan-melati': () => [200, { data: board }],
  });
  return renderApp('/b/jalan-melati/lapor');
}

describe('Form laporan', () => {
  it('memvalidasi field wajib dan tidak menampilkan centang anonim untuk tamu', async () => {
    renderGuestReportForm();
    const submit = await screen.findByRole('button', { name: 'Kirim Laporan' });

    expect(screen.queryByLabelText('Kirim sebagai Anonim')).not.toBeInTheDocument();
    expect(screen.getByText('Laporan tamu dikirim secara anonim.')).toBeInTheDocument();

    fireEvent.click(submit);

    expect(await screen.findByText('Judul laporan wajib diisi')).toBeInTheDocument();
    expect(screen.getByText('Detail lokasi wajib diisi')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi minimal 20 karakter')).toBeInTheDocument();
    expect(screen.getByText('Unggah minimal 1 foto masalah.')).toBeInTheDocument();
  });

  it('menolak foto kelima dan hanya menampilkan maksimal empat pratinjau', async () => {
    const files = [];
    function TestUploader() {
      const [selected, setSelected] = useState(files);
      return <PhotoUploader files={selected} onChange={setSelected} />;
    }
    render(<TestUploader />);
    const upload = screen.getByLabelText('Unggah foto laporan');
    const photos = Array.from(
      { length: 5 },
      (_, index) => new File([`foto-${index}`], `foto-${index}.png`, { type: 'image/png' }),
    );

    fireEvent.change(upload, { target: { files: photos } });

    expect(await screen.findAllByRole('button', { name: /^Hapus foto/ })).toHaveLength(4);
    expect(screen.getByRole('alert')).toHaveTextContent('Maksimal 4 foto.');
  });

  it('menolak file yang bukan foto dengan pesan jelas', async () => {
    function TestUploader() {
      const [selected, setSelected] = useState([]);
      return <PhotoUploader files={selected} onChange={setSelected} />;
    }
    render(<TestUploader />);

    fireEvent.change(screen.getByLabelText('Unggah foto laporan'), {
      target: { files: [new File(['isi'], 'catatan.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('catatan.pdf: file ini bukan foto.');
    expect(screen.queryByRole('button', { name: /^Hapus foto/ })).not.toBeInTheDocument();
  });
});
