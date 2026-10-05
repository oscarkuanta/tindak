import { Link } from 'react-router';
import { Card } from '../ui/Card.jsx';
import { ReportSeverityBadge, ReportStatusBadge } from './ReportStatusBadge.jsx';

function relativeTime(value) {
  if (!value) return 'Waktu tidak tersedia';
  const date = new Date(value);
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

export function ReportCard({ report }) {
  const photo = report.media?.[0] ?? report.photos?.[0];
  const reportUrl = `/laporan/${report.id}`;

  return (
    <Card className="overflow-hidden p-0">
      <Link
        to={reportUrl}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      >
        {photo?.url && (
          <img
            src={photo.url}
            alt={photo.isBlurred ? 'Foto laporan diburamkan' : `Foto laporan: ${report.title}`}
            className={`max-h-72 w-full object-cover ${photo.isBlurred ? 'blur-md' : ''}`}
          />
        )}
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <ReportSeverityBadge severity={report.severity} />
            <ReportStatusBadge status={report.status} />
          </div>
          <h2 className="mt-3 text-lg font-semibold">{report.title}</h2>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
            {report.category?.name && <span>{report.category.name}</span>}
            {report.locationDetail && <span>{report.locationDetail}</span>}
            <time dateTime={report.createdAt}>{relativeTime(report.createdAt)}</time>
          </div>
        </div>
      </Link>
      <div className="flex gap-2 border-t border-border px-4 py-3">
        <button
          type="button"
          disabled
          title="Segera hadir"
          className="rounded-base px-2 py-1 text-sm text-text-muted disabled:cursor-not-allowed"
        >
          Dukung
        </button>
        <button
          type="button"
          disabled
          title="Segera hadir"
          className="rounded-base px-2 py-1 text-sm text-text-muted disabled:cursor-not-allowed"
        >
          Reaksi
        </button>
      </div>
    </Card>
  );
}
