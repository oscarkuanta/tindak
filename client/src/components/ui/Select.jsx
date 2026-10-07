import { useId } from 'react';
import { cn } from '../../lib/cn.js';

export function Select({ label, error, hint, id, className, children, ...props }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const messageId = `${selectId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={message ? messageId : undefined}
        className={cn('w-full', error && 'border-danger focus:border-danger', className)}
        {...props}
      >
        {children}
      </select>
      {message && (
        <p id={messageId} className={cn('text-xs', error ? 'text-danger' : 'text-text-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}
