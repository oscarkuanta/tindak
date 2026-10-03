import { useId } from 'react';
import { cn } from '../../lib/cn.js';

export function Input({
  label,
  error,
  hint,
  id,
  className,
  'aria-describedby': describedBy,
  ...props
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [message && messageId, describedBy].filter(Boolean).join(' ') || undefined
        }
        className={cn(
          'h-10 w-full rounded-base border bg-surface px-3 text-sm text-text placeholder:text-text-muted',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      />
      {message && (
        <p id={messageId} className={cn('text-xs', error ? 'text-danger' : 'text-text-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}
