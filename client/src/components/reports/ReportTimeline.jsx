import { REPORT_STATUS_LABELS } from '@tindak/shared';

export function ReportTimeline({ report }) {
  const events = report.timeline?.length
    ? report.timeline
    : [{ status: 'NEW', createdAt: report.createdAt, note: 'Laporan dibuat' }];

  return (
    <ol className="space-y-4" aria-label="Riwayat laporan">
      {events.map((event, index) => (
        <li
          key={event.id ?? `${event.status}-${event.createdAt}-${index}`}
          className="relative flex gap-3"
        >
          <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {event.note || REPORT_STATUS_LABELS[event.status] || 'Pembaruan laporan'}
            </p>
            {event.status && (
              <p className="text-xs text-text-muted">
                {REPORT_STATUS_LABELS[event.status] ?? event.status}
              </p>
            )}
            {event.createdAt && (
              <time className="text-xs text-text-muted" dateTime={event.createdAt}>
                {new Intl.DateTimeFormat('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(event.createdAt))}
              </time>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
