import { useEffect, useId, useRef, useState } from 'react';
import { BellSimple } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { NOTIFICATION_DROPDOWN_LIMIT } from '@tindak/shared';
import { Spinner } from '../ui/index.js';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '../../features/notifications/hooks.js';
import { NotificationItem } from './NotificationItem.jsx';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const panelId = useId();
  const countQuery = useUnreadCount();
  const listQuery = useNotifications(
    { page: 1, pageSize: NOTIFICATION_DROPDOWN_LIMIT },
    { enabled: open },
  );
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const count = countQuery.data?.data?.count ?? 0;
  const notifications = listQuery.data?.data ?? [];

  useEffect(() => {
    if (!open) return undefined;
    function handlePointer(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function handleOpen(notification) {
    setOpen(false);
    if (!notification.isRead) markRead.mutate(notification.id);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={count > 0 ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-9 items-center justify-center rounded-full text-surface transition-colors hover:bg-surface/15"
      >
        <BellSimple size={21} weight="bold" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            data-testid="notification-badge"
            className="notif-badge absolute -top-1 -right-1"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifikasi terbaru"
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-border bg-surface p-2 shadow-card"
        >
          <div className="flex items-center justify-between px-2 pb-2">
            <h2 className="text-sm font-semibold">Notifikasi</h2>
            <button
              type="button"
              disabled={count === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
              className="text-xs font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
            >
              Tandai semua dibaca
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {listQuery.isPending ? (
              <Spinner label="Memuat notifikasi" />
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-text-muted">Belum ada notifikasi.</p>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={handleOpen}
                />
              ))
            )}
          </div>
          <Link
            to="/notifikasi"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-base px-3 py-2 text-center text-sm font-semibold text-brand hover:bg-surface-muted"
          >
            Lihat semua
          </Link>
        </div>
      )}
    </div>
  );
}
