import { cn } from '../../lib/cn.js';

const PADDING_CLASS = /(^|\s)!?p-\d/;

export function Card({ as: Component = 'div', className, ...props }) {
  return (
    <Component
      className={cn(
        'rounded-card border border-border bg-surface shadow-card',
        !PADDING_CLASS.test(className ?? '') && 'p-4',
        className,
      )}
      {...props}
    />
  );
}
