import { cn } from '../../lib/cn.js';

export function Card({ as: Component = 'div', className, ...props }) {
  return (
    <Component
      className={cn('rounded-base border border-border bg-surface p-4', className)}
      {...props}
    />
  );
}
