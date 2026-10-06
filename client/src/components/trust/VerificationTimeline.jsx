import { VERIFICATION_ACTION_LABELS } from '@tindak/shared';

const DOT_TONES = { GRANTED: 'bg-accent', REVOKED: 'bg-danger', SKIPPED: 'bg-border' };

function formatDate(value) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function VerificationTimeline({
  entries = [],
  emptyText = 'Belum ada riwayat verifikasi.',
}) {
  if (entries.length === 0) return <p className="text-sm text-text-muted">{emptyText}</p>;
  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative text-sm">
          <span
            aria-hidden="true"
            className={`absolute top-1.5 -left-[21px] size-2.5 rounded-full ${DOT_TONES[entry.action]}`}
          />
          <p className="font-medium">{VERIFICATION_ACTION_LABELS[entry.action]}</p>
          <p className="text-xs text-text-muted">
            <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
            {entry.actor !== undefined && ` · ${entry.actor?.name ?? 'Sistem'}`}
          </p>
          {entry.reason && <p className="mt-1 text-text-muted">&quot;{entry.reason}&quot;</p>}
        </li>
      ))}
    </ol>
  );
}
