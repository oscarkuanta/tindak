import { cn } from '../../lib/cn.js';

export function Chip({ tone = 'neutral', className, ...props }) {
  const tones = {
    neutral: 'bg-surface-muted text-text-muted',
    mint: 'bg-mint-50 text-mint-700',
    cream: 'bg-cream text-amber',
    sky: 'bg-sky text-blue',
    violet: 'bg-violet-50 text-violet',
    danger: 'bg-red-50 text-red',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
