import { BOARD_TYPE_LABELS, TRUST_LABEL_TEXT } from '@tindak/shared';

export function OfficialBadge() {
  return (
    <span
      aria-label="Official"
      className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
        <circle cx="10" cy="10" r="10" fill="currentColor" />
        <path
          d="m5.6 10.2 2.8 2.7 6-6"
          fill="none"
          stroke="var(--color-brand-contrast)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
      <span>Official</span>
    </span>
  );
}

export function CommunityBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-muted">
      Komunitas
    </span>
  );
}

export function VerificationBadge({ verification }) {
  return verification === 'OFFICIAL' ? <OfficialBadge /> : <CommunityBadge />;
}

export function ScopeBadge({ type }) {
  const label = BOARD_TYPE_LABELS[type] ?? 'Lainnya';
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-muted">
      {label}
    </span>
  );
}

export function TrustBadge({ label }) {
  const text = TRUST_LABEL_TEXT[label];
  if (!text) return null;
  return (
    <span className="inline-flex items-center rounded-base border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-muted">
      {text}
    </span>
  );
}
