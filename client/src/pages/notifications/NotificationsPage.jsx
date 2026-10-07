import { useState } from 'react';
import { Button, Card } from '../../components/ui/index.js';
import { NotificationItem } from '../../components/notifications/NotificationItem.jsx';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '../../features/notifications/hooks.js';
import { Pager, QueryState } from '../admin/adminShared.jsx';

export function NotificationsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, unread: false });
  const query = useNotifications(filters);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Notifikasi</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-brand"
              checked={filters.unread}
              onChange={(event) =>
                setFilters({ ...filters, unread: event.target.checked, page: 1 })
              }
            />
            Hanya belum dibaca
          </label>
          <Button
            variant="secondary"
            size="sm"
            loading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Tandai semua dibaca
          </Button>
        </div>
      </div>
      <QueryState query={query} empty="Belum ada notifikasi.">
        {(notifications, meta) => (
          <>
            <Card className="flex flex-col gap-1 p-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={(item) => !item.isRead && markRead.mutate(item.id)}
                />
              ))}
            </Card>
            <Pager
              meta={meta}
              page={filters.page}
              onPage={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </QueryState>
    </section>
  );
}
