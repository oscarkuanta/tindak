import { Link } from 'react-router';
import { ArrowRight, ChartBar } from '@phosphor-icons/react';
import { cn } from '../../lib/cn.js';

const TONES = ['mint', 'red', 'blue', 'violet', 'amber', 'slate'];

export function StatCard({
  label,
  value,
  note,
  icon: Icon = ChartBar,
  tone = 'mint',
  to,
  valueTestId,
  className,
}) {
  const content = (
    <>
      <span className="stat-card__icon" aria-hidden="true">
        <Icon size={22} weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-text-muted">{label}</span>
        <span
          data-testid={valueTestId}
          className="stat-card__value mt-0.5 block truncate text-2xl font-bold leading-tight text-text"
        >
          {value ?? '—'}
        </span>
        {note && <span className="mt-0.5 block text-[11px] text-text-muted">{note}</span>}
      </span>
      {to && (
        <ArrowRight aria-hidden="true" size={18} weight="bold" className="shrink-0 opacity-60" />
      )}
    </>
  );
  const classes = cn(
    'stat-card',
    `stat-card--${TONES.includes(tone) ? tone : 'mint'}`,
    to && 'stat-card--link',
    className,
  );
  return to ? (
    <Link to={to} className={classes}>
      {content}
    </Link>
  ) : (
    <article className={classes}>{content}</article>
  );
}
