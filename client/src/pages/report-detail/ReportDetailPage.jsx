import { Link, useParams } from 'react-router';
import { Alert, Card, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import {
  ReportSeverityBadge,
  ReportStatusBadge,
} from '../../components/reports/ReportStatusBadge.jsx';
import { ReportTimeline } from '../../components/reports/ReportTimeline.jsx';
import { useReport } from '../../features/reports/hooks.js';

export function ReportDetailPage() {
  const { id } = useParams();
  const query = useReport(id);

  if (query.isPending) return <Spinner label="Memuat laporan" />;
  if (query.error?.status === 404) {
    return (
      <EmptyState
        title="Laporan tidak ditemukan"
        description="Laporan ini tidak tersedia atau sudah dihapus."
      />
    );
  }
  if (query.isError) return <Alert>{query.error.message}</Alert>;

  const report = query.data.data;
  return (
    <article className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <ReportSeverityBadge severity={report.severity} />
        <ReportStatusBadge status={report.status} />
      </div>
      <h1 className="mt-3 text-2xl font-bold">{report.title}</h1>
      {report.board && (
        <Link
          to={`/b/${report.board.slug}`}
          className="mt-2 inline-block text-sm font-semibold text-brand"
        >
          {report.board.name}
        </Link>
      )}
      <Card className="mt-5">
        {report.media?.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {report.media.map((media) => (
              <img
                key={media.id ?? media.url}
                src={media.url}
                alt={media.isBlurred ? 'Foto laporan diburamkan' : `Foto laporan: ${report.title}`}
                className={`max-h-96 w-full rounded-base object-cover ${media.isBlurred ? 'blur-md' : ''}`}
              />
            ))}
          </div>
        )}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">Kategori</dt>
            <dd className="font-medium">{report.category?.name ?? 'Tidak tersedia'}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Lokasi</dt>
            <dd className="font-medium">{report.locationDetail}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Pelapor</dt>
            <dd className="font-medium">
              {report.isAnonymous ? 'Anonim' : (report.reporter?.name ?? 'Anonim')}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Dibuat</dt>
            <dd className="font-medium">
              {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(
                new Date(report.createdAt),
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-6">{report.description}</p>
        <div className="mt-6 border-t border-border pt-5">
          <h2 className="mb-4 font-semibold">Timeline</h2>
          <ReportTimeline report={report} />
        </div>
      </Card>
    </article>
  );
}
