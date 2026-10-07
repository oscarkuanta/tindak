import { useState } from 'react';
import { Link } from 'react-router';
import { Alert, Card, Input, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { VerificationBadge } from '../../components/boards/BoardBadges.jsx';
import { useBoardSearch } from '../../features/boards/hooks.js';

export function ReportBoardPickerPage() {
  const [query, setQuery] = useState('');
  const searching = query.trim().length >= 2;
  const search = useBoardSearch({ q: searching ? query.trim() : '', page: 1, pageSize: 10 });
  const boards = search.data?.data ?? [];

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-brand">Bantu lingkunganmu</p>
        <h1 className="mt-1 text-2xl font-bold">Pilih Board untuk laporan</h1>
        <p className="mt-2 text-sm text-text-muted">Cari Board yang mencakup lokasi masalah.</p>
      </header>
      <Input
        label="Cari nama Board"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Contoh: Jalan Rungkut"
      />
      {search.isError && <Alert>{search.error.message}</Alert>}
      {search.isPending && <Spinner label="Mencari Board" />}
      {!searching && boards.length > 0 && (
        <h2 className="text-sm font-semibold text-text-muted">Board terpopuler</h2>
      )}
      {boards.length > 0 && (
        <ul className="flex flex-col gap-3">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                to={`/b/${board.slug}/lapor`}
                className="block rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Card className="transition hover:border-brand">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {board.name} <VerificationBadge verification={board.verification} />
                  </span>
                  <span className="mt-1 block text-sm text-text-muted">{board.city}</span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !search.isPending && !search.isError && boards.length === 0 && (
        <EmptyState
          title="Board tidak ditemukan"
          description="Periksa ejaan atau cari dengan nama lain."
        />
      )}
      {!searching && !search.isPending && !search.isError && boards.length === 0 && (
        <EmptyState
          title="Belum ada Board"
          description="Buat Board baru untuk mulai menerima laporan."
        />
      )}
    </section>
  );
}
