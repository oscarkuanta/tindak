import { cn } from '../../lib/cn.js';

const TONES = {
  neutral: 'bg-surface-muted text-text-muted border-border',
  brand: 'bg-brand-soft text-mint-700 border-mint-100',
  danger: 'bg-red-50 text-red border-red/20',
  warning: 'bg-amber-50 text-amber border-amber/20',
  success: 'bg-mint-50 text-mint-700 border-mint-100',
  info: 'bg-sky text-blue border-blue/20',
};

export function Badge({ tone = 'neutral', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
