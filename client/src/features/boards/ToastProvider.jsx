import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { ToastContext } from './toastContext.js';

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message, tone = 'success') {
    setToast({ message, tone, id: Date.now() });
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children ?? <Outlet />}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`fixed right-4 bottom-4 z-50 max-w-sm rounded-base border px-4 py-3 text-sm shadow-card ${
            toast.tone === 'danger'
              ? 'border-danger/30 bg-surface text-danger'
              : 'border-success/30 bg-surface text-text'
          }`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
