import { cn } from '../../lib/cn.js';

export function Spinner({ label = 'Memuat...', className }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-8', className)}>
      <span className="size-5 animate-spin rounded-full border-2 border-border border-t-brand" />
      <span className="text-sm text-text-muted">{label}</span>
    </div>
  );
}
