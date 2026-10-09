import { useState } from 'react';
import { Link } from 'react-router';
import { Info, MagnifyingGlass } from '@phosphor-icons/react';
import { Alert, Button, Input, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { ReportCard } from '../../components/reports/ReportCard.jsx';
import { useMyReports } from '../../features/reports/hooks.js';

function TrackingHelp() {
  return (
    <details className="rounded-card border border-blue-200 bg-blue-100 p-4 text-sm text-blue-700">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <Info size={18} weight="fill" aria-hidden="true" />
        Apa itu Kode Lacak dan cara memakainya?
      </summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5">
        <li>
          Setiap laporan punya Kode Lacak, misalnya <span className="font-mono">TND-K7M2P9QX</span>.
          Kodenya muncul setelah laporan terkirim dan di halaman detail laporan.
        </li>
        <li>Ketik kode itu di kotak cari di atas untuk langsung menemukan laporannya.</li>
        <li>
          Laporan yang dikirim tanpa masuk akun dipantau lewat halaman{' '}
          <Link to="/lacak" className="font-semibold underline">
            Lacak Laporan
          </Link>{' '}
          dengan Kode Lacak dan tautan rahasianya. Setelah kamu masuk di browser yang sama, laporan
          itu otomatis pindah ke Laporan Saya.
        </li>
      </ol>
    </details>
  );
}

export function MyReportsPage() {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [inputError, setInputError] = useState('');
  const query = useMyReports({ page, pageSize: 10, q: keyword || undefined });
  const reports = query.data?.data ?? [];
  const meta = query.data?.meta;

  function search(event) {
    event.preventDefault();
    const value = draft.trim();
    if (value && value.length < 2) {
      setInputError('Kata kunci minimal 2 karakter');
      return;
    }
    setInputError('');
    setKeyword(value);
    setPage(1);
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <p className="text-sm font-semibold text-brand">Riwayat laporan akun</p>
        <h1 className="mt-1 text-2xl font-bold">Laporan Saya</h1>
      </header>

      <form onSubmit={search} className="flex items-start gap-2" role="search">
        <div className="min-w-0 flex-1">
          <Input
            label="Cari laporan"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Kata kunci atau Kode Lacak, contoh TND-K7M2P9QX"
            error={inputError || undefined}
          />
        </div>
        <Button type="submit" className="mt-6">
          <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
          Cari
        </Button>
      </form>

      <TrackingHelp />

      {keyword && (
        <p className="text-sm text-text-muted">
          Hasil untuk <strong>{keyword}</strong>{' '}
          <button
            type="button"
            onClick={() => {
              setDraft('');
              setKeyword('');
              setPage(1);
            }}
            className="font-semibold text-brand hover:underline"
          >
            Hapus pencarian
          </button>
        </p>
      )}

      {query.isPending ? (
        <Spinner label="Memuat laporan saya" />
      ) : query.isError ? (
        <Alert>{query.error.message}</Alert>
      ) : reports.length ? (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
          {meta?.totalPages > 1 && (
            <nav aria-label="Halaman laporan saya" className="flex items-center justify-between">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-text-muted">
                Halaman {meta.page ?? page} dari {meta.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Berikutnya
              </Button>
            </nav>
          )}
        </div>
      ) : (
        <EmptyState
          title={keyword ? 'Laporan tidak ditemukan' : 'Belum ada laporan'}
          description={
            keyword
              ? 'Coba kata kunci lain atau periksa lagi Kode Lacaknya.'
              : 'Laporan yang kamu kirim saat masuk akan muncul di sini.'
          }
        />
      )}
    </section>
  );
}
