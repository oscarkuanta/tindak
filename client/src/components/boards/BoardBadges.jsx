import { Moon, SealCheck, Sparkle, Star, UsersThree, Warning } from '@phosphor-icons/react';
import { BOARD_TYPE_LABELS, TRUST_LABEL_TEXT } from '@tindak/shared';
import { BoardTypeIcon } from '../icons/AppIcons.jsx';
import { TRUST_TOOLTIP, formatScore } from './trustFormat.js';

export function OfficialBadge({ size = 'md', withLabel = true }) {
  const small = size === 'sm';
  return (
    <span
      aria-label="Official"
      title="Diverifikasi manual oleh Admin Board"
      className={`official-badge inline-flex items-center gap-1 font-semibold ${small ? 'text-[11px]' : 'text-xs'}`}
    >
      <SealCheck
        aria-hidden="true"
        weight="fill"
        size={small ? 15 : 19}
        className="verified-badge"
      />
      {withLabel && <span>Official</span>}
    </span>
  );
}

export function CommunityBadge({ size = 'md' }) {
  const small = size === 'sm';
  return (
    <span
      className={`community-badge inline-flex items-center gap-1 rounded-full font-medium ${small ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
    >
      <UsersThree aria-hidden="true" weight="fill" size={small ? 11 : 13} />
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-text-muted">
      <BoardTypeIcon type={type} size={14} />
      {label}
    </span>
  );
}

const TRUST_ICONS = { NEW: Sparkle, TRUSTED: SealCheck, CAUTION: Warning, INACTIVE: Moon };

export function TrustBadge({ label, score }) {
  if (!Object.hasOwn(TRUST_LABEL_TEXT, label)) return null;
  const text = TRUST_LABEL_TEXT[label];
  const showScore = label !== 'NEW' && label !== 'INACTIVE' && formatScore(score);
  const description = [showScore && `Skor kepercayaan ${formatScore(score)}`, text]
    .filter(Boolean)
    .join(', ');
  const Icon = TRUST_ICONS[label];
  return (
    <span
      title={TRUST_TOOLTIP}
      aria-label={description}
      className={`trust-badge trust-badge--${label} inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold`}
    >
      {showScore && (
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          <Star weight="fill" size={13} className="trust-badge__star" /> {formatScore(score)}
        </span>
      )}
      {showScore && text && <span aria-hidden="true">·</span>}
      {text && (
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          {Icon && <Icon weight="fill" size={13} />}
          <span>{text}</span>
        </span>
      )}
    </span>
  );
}
