import { cn } from '../../lib/cn.js';

const TONES = {
  danger: 'border-red/20 bg-red-50 text-red',
  info: 'border-blue/20 bg-sky text-blue',
  success: 'border-mint-100 bg-mint-50 text-mint-700',
  warning: 'border-amber/20 bg-amber-50 text-text',
};

export function Alert({ tone = 'danger', className, ...props }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-card border px-4 py-3 text-sm leading-6', TONES[tone], className)}
      {...props}
    />
  );
}
