import { useId } from 'react';
import { cn } from '../../lib/cn.js';

export function Input({
  label,
  error,
  hint,
  id,
  className,
  trailing,
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
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [message && messageId, describedBy].filter(Boolean).join(' ') || undefined
          }
          className={cn(
            'h-11 w-full rounded-full border-[1.5px] bg-surface px-4 text-sm text-text placeholder:text-text-muted',
            'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
            error ? 'border-danger focus:border-danger' : 'border-border',
            trailing && 'pr-12',
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {message && (
        <p id={messageId} className={cn('text-xs', error ? 'text-danger' : 'text-text-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}
