import { useState } from 'react';
import { Alert, Button, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { ReportCard } from '../../components/reports/ReportCard.jsx';
import { useMyReports } from '../../features/reports/hooks.js';

export function MyReportsPage() {
  const [page, setPage] = useState(1);
  const query = useMyReports({ page, pageSize: 10 });
  const reports = query.data?.data ?? [];
  const meta = query.data?.meta;

  if (query.isPending) return <Spinner label="Memuat laporan saya" />;
  if (query.isError) return <Alert>{query.error.message}</Alert>;

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-5">
        <p className="text-sm font-semibold text-brand">Riwayat laporan akun</p>
        <h1 className="mt-1 text-2xl font-bold">Laporan Saya</h1>
      </header>
      {reports.length ? (
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
          title="Belum ada laporan"
          description="Laporan yang kamu kirim saat masuk akan muncul di sini."
        />
      )}
    </section>
  );
}
