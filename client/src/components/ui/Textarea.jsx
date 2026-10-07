import { useId } from 'react';
import { cn } from '../../lib/cn.js';

export function Textarea({ label, error, hint, id, className, ...props }) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={Boolean(error)}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          'w-full text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
          error && 'border-danger focus:border-danger',
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
