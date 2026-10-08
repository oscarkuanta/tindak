import { BOARD_TYPE_LABELS, TRUST_LABEL_TEXT } from '@tindak/shared';
import { TRUST_TOOLTIP, formatScore } from './trustFormat.js';

export function OfficialBadge({ size = 'md' }) {
  const small = size === 'sm';
  return (
    <span
      aria-label="Official"
      title="Diverifikasi manual oleh Admin Board"
      className={`official-badge inline-flex items-center gap-1 font-semibold ${small ? 'text-[11px]' : 'text-xs'}`}
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
      className={`community-badge inline-flex items-center rounded-full font-medium ${small ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
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
    <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-text-muted">
      {label}
    </span>
  );
}

const TRUST_ICONS = { NEW: '🆕', TRUSTED: '✓', CAUTION: '⚠️', INACTIVE: '💤' };

export function TrustBadge({ label, score }) {
  if (!Object.hasOwn(TRUST_LABEL_TEXT, label)) return null;
  const text = TRUST_LABEL_TEXT[label];
  const showScore = label !== 'NEW' && label !== 'INACTIVE' && formatScore(score);
  const description = [showScore && `Skor kepercayaan ${formatScore(score)}`, text]
    .filter(Boolean)
    .join(', ');
  return (
    <span
      title={TRUST_TOOLTIP}
      aria-label={description}
      className="trust-badge inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
    >
      {showScore && (
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          <span className="trust-badge__star">★</span> {formatScore(score)}
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
