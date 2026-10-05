import { REPORT_HANDLING_STATUS_LABELS, REPORT_REJECTION_REASON_LABELS } from '@tindak/shared';

function actorLabel(entry) {
  if (entry.actor?.name || entry.actorName) return entry.actor?.name ?? entry.actorName;
  if (entry.actorType === 'SYSTEM') return 'Sistem';
  if (entry.actorType === 'REPORTER') return 'Pelapor';
  return 'Penindak';
}

function formatDate(value) {
  if (!value) return 'Waktu belum tersedia';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ReportTimeline({ entries = [] }) {
  if (!entries.length) {
    return <p className="text-sm text-text-muted">Riwayat laporan belum tersedia.</p>;
  }

  return (
    <ol className="relative space-y-0 border-l border-border pl-5">
      {entries.map((entry, index) => {
        const status = REPORT_HANDLING_STATUS_LABELS[entry.toStatus] ?? entry.toStatus;
        const reason = REPORT_REJECTION_REASON_LABELS[entry.reason];
        const isAutomatic =
          entry.actorType === 'SYSTEM' &&
          (entry.note?.toLocaleLowerCase('id-ID').includes('otomatis') || entry.isAutomatic);

        return (
          <li key={entry.id ?? `${entry.createdAt}-${index}`} className="relative pb-5 last:pb-0">
            <span
              aria-hidden="true"
              className="absolute -left-[1.625rem] top-0.5 grid size-4 place-items-center rounded-full border-2 border-surface bg-brand text-[0.55rem] text-brand-contrast"
            >
              {entry.actorType === 'SYSTEM' ? '⚙' : entry.toStatus === 'RESOLVED' ? '✓' : '•'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm">{status}</strong>
              {isAutomatic && (
                <span className="text-xs font-medium text-info">Dikonfirmasi otomatis</span>
              )}
              {entry.toStatus === 'REOPENED' && (
                <span className="text-xs font-medium text-danger">Dibuka Ulang</span>
              )}
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {actorLabel(entry)}
              {reason ? ` · ${reason}` : ''}
              {entry.note ? ` · ${entry.note}` : ''}
            </p>
            <time className="mt-1 block text-xs text-text-muted" dateTime={entry.createdAt}>
              {formatDate(entry.createdAt)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
