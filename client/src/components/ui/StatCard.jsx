import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const TONES = ['mint', 'cream', 'sky'];

export function StatCard({
  label,
  value,
  note,
  icon: Icon = ArrowUpRight,
  tone = 'mint',
  valueTestId,
  className,
}) {
  return (
    <article
      className={cn('stat-card', `stat-card--${TONES.includes(tone) ? tone : 'mint'}`, className)}
    >
      <span className="stat-card__icon" aria-hidden="true">
        <Icon size={21} strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-text-muted">{label}</span>
        <span
          data-testid={valueTestId}
          className="mt-0.5 block truncate text-xl font-bold leading-tight text-text"
        >
          {value ?? '—'}
        </span>
        {note && <span className="mt-0.5 block text-[11px] text-text-muted">{note}</span>}
      </span>
    </article>
  );
}
