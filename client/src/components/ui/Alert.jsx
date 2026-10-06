import { cn } from '../../lib/cn.js';

const TONES = {
  danger: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-accent/30 bg-accent-soft text-accent',
  success: 'border-success/30 bg-success/10 text-success',
};

export function Alert({ tone = 'danger', className, ...props }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-base border px-3 py-2 text-sm', TONES[tone], className)}
      {...props}
    />
  );
}
