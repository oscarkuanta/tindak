import { Link, useParams } from 'react-router';
import { Alert, Button, Spinner } from '../../components/ui/index.js';
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

  return <ReportDetailContent key={query.data.data.id} report={query.data.data} />;
}
