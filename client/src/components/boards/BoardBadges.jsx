import { BOARD_TYPE_LABELS, TRUST_LABEL_TEXT } from '@tindak/shared';
import { TRUST_TOOLTIP, formatScore } from './trustFormat.js';

export function OfficialBadge({ size = 'md' }) {
  const small = size === 'sm';
  return (
    <span
      aria-label="Official"
      title="Diverifikasi manual oleh Admin Board"
      className={`inline-flex items-center gap-1 font-semibold text-accent ${small ? 'text-[11px]' : 'text-xs'}`}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className={small ? 'size-3' : 'size-4'}>
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

export function CommunityBadge({ size = 'md' }) {
  const small = size === 'sm';
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border bg-surface font-medium text-text-muted ${small ? 'px-1.5 text-[11px]' : 'px-2 py-0.5 text-xs'}`}
    >
      Komunitas
    </span>
  );
}

export function VerificationBadge({ verification, size = 'md' }) {
  return verification === 'OFFICIAL' ? (
    <OfficialBadge size={size} />
  ) : (
    <CommunityBadge size={size} />
  );
}

export function ScopeBadge({ type }) {
  const label = BOARD_TYPE_LABELS[type] ?? 'Lainnya';
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-muted">
      {label}
    </span>
  );
}

const TRUST_TONES = {
  TRUSTED: 'border-success/40 bg-success/10 text-success',
  CAUTION: 'border-danger/40 bg-danger/10 text-danger',
  NEW: 'border-border bg-surface-muted text-text-muted',
  NONE: 'border-warning/40 bg-warning/10 text-text',
  INACTIVE: 'border-border bg-surface-muted text-text-muted',
};

const TRUST_ICONS = { NEW: '🆕', TRUSTED: '✅', CAUTION: '⚠️', INACTIVE: '💤' };

export function TrustBadge({ label, score }) {
  const tone = TRUST_TONES[label];
  if (!tone) return null;
  const text = TRUST_LABEL_TEXT[label];
  const showScore = label !== 'NEW' && label !== 'INACTIVE' && formatScore(score);
  const description = [showScore && `Skor kepercayaan ${formatScore(score)}`, text]
    .filter(Boolean)
    .join(', ');
  return (
    <span
      title={TRUST_TOOLTIP}
      aria-label={description}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {showScore && (
        <span aria-hidden="true" className="font-semibold">
          ⭐ {formatScore(score)}
        </span>
      )}
      {showScore && text && <span aria-hidden="true">·</span>}
      {text && (
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          {TRUST_ICONS[label] && <span>{TRUST_ICONS[label]}</span>}
          <span>{text}</span>
        </span>
      )}
    </span>
  );
}
