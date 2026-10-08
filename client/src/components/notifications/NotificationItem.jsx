import { Link } from 'react-router';
import { notificationLink } from '@tindak/shared';
import { notificationText } from '../../features/notifications/notificationText.js';
import { relativeTime } from '../../lib/relativeTime.js';
import { cn } from '../../lib/cn.js';
import { NotificationIcon } from '../icons/AppIcons.jsx';

export function NotificationItem({ notification, onOpen, className }) {
  return (
    <Link
      to={notificationLink(notification)}
      onClick={() => onOpen?.(notification)}
      className={cn(
        'flex gap-3 rounded-base px-3 py-2 text-sm hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none',
        !notification.isRead && 'bg-brand-soft',
        className,
      )}
    >
      <NotificationIcon type={notification.type} />
      <span className="min-w-0 flex-1">
        <span className={cn('block', !notification.isRead && 'font-semibold')}>
          {notificationText(notification)}
        </span>
        <time dateTime={notification.createdAt} className="text-xs text-text-muted">
          {relativeTime(notification.createdAt)}
        </time>
      </span>
      {!notification.isRead && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="Belum dibaca" />
      )}
    </Link>
  );
}
