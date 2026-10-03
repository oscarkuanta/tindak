import { useEffect, useId, useRef } from 'react';
import { cn } from '../../lib/cn.js';

export function Modal({ open, onClose, title, children, className }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  function handleCancel(event) {
    event.preventDefault();
    onClose?.();
  }

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) onClose?.();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={title ? titleId : undefined}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-surface p-0 text-text shadow-card',
        'backdrop:bg-text/50 backdrop:backdrop-blur-sm',
        className,
      )}
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          {title && (
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="rounded-base px-2 text-xl leading-none text-text-muted hover:bg-surface-muted"
              >
                ×
              </button>
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
