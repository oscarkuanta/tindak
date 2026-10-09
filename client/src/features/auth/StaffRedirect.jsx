import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router';
import { useToast } from '../boards/toastContext.js';

export function StaffRedirect({ message }) {
  const { showToast } = useToast();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    showToast(message, 'info');
  }, [showToast, message]);

  return <Navigate to="/" replace />;
}
