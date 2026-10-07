import { Link, useParams } from 'react-router';
import { Alert, Button, Card, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { ReportDetailContent } from '../../components/reports/ReportDetailContent.jsx';
import { useReportDetail } from '../../features/handling/hooks.js';

export function ReportDetailPage() {
  const { id } = useParams();
  const query = useReportDetail(id);

  if (query.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner label="Memuat laporan" />
      </div>
    );
  }
  if (query.error?.status === 404 || query.error?.code === 'REPORT_NOT_FOUND') {
    return (
      <EmptyState
        title="Laporan tidak ditemukan"
        description="Periksa kembali tautan laporan atau cari Board untuk melihat laporan lainnya."
        action={
          <Link to="/cari" className="text-sm font-semibold text-brand hover:underline">
            Cari Board
          </Link>
        }
      />
    );
  }
  if (query.isError) {
    return (
      <Alert>
        {query.error.message}{' '}
        <Button variant="ghost" className="underline" onClick={() => query.refetch()}>
          Coba lagi
        </Button>
      </Alert>
    );
  }

  const report = query.data.data;
  if (report.isHidden && report.moderationNotice) {
    return (
      <Card className="mx-auto max-w-2xl bg-surface-muted text-center">
        <p className="text-3xl" aria-hidden="true">
          🛡️
        </p>
        <h1 className="mt-2 text-lg font-semibold">{report.moderationNotice}</h1>
        <p className="mt-2 text-sm text-text-muted">
          Laporan ini disembunyikan sementara karena ditandai melanggar aturan komunitas.
        </p>
        {report.board?.slug && (
          <Link
            to={`/b/${report.board.slug}`}
            className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
          >
            Kembali ke {report.board.name}
          </Link>
        )}
      </Card>
    );
  }

  return <ReportDetailContent key={report.id} report={report} />;
}
