import { NavLink } from 'react-router';
import {
  BellSimple,
  BookmarkSimple,
  ClipboardText,
  Compass,
  EnvelopeSimple,
  House,
  MagnifyingGlassPlus,
  SealCheck,
  ShieldStar,
  SquaresFour,
} from '@phosphor-icons/react';
import { USER_ROLES } from '@tindak/shared';
import { cn } from '../../lib/cn.js';
import { useMe } from '../../features/auth/hooks.js';
import { useMyFollows } from '../../features/boards/hooks.js';
import { useMyInvitations } from '../../features/invitations/hooks.js';
import { useUnreadCount } from '../../features/notifications/hooks.js';

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors',
          isActive ? 'bg-surface text-mint-700 shadow-card' : 'text-text-muted hover:bg-surface',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={20} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          {item.badge > 0 && (
            <span className="notif-badge" aria-label={`${item.badge} baru`}>
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function NavSection({ title, items }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 border-t border-border pt-3">
      <h2 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h2>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </div>
    </div>
  );
}

export function LeftNav() {
  const { data: user } = useMe();
  const followsQuery = useMyFollows({ enabled: Boolean(user) });
  const invitationsQuery = useMyInvitations({ enabled: Boolean(user) });
  const follows = followsQuery.data?.data ?? [];
  const invitationCount = invitationsQuery.data?.data?.length ?? 0;
  const unreadQuery = useUnreadCount({ enabled: Boolean(user) });
  const unreadCount = unreadQuery.data?.data?.count ?? 0;
  const navItems = [
    { to: '/', label: 'Beranda', end: true, icon: House },
    ...(user ? [{ to: '/board-saya', label: 'Board Saya', icon: SquaresFour }] : []),
    { to: '/board-diikuti', label: 'Board Diikuti', icon: BookmarkSimple },
    { to: '/cari', label: 'Jelajahi Board', icon: Compass },
    { to: '/lacak', label: 'Lacak Laporan', icon: MagnifyingGlassPlus },
  ];
  const accountItems = user
    ? [
        { to: '/laporan-saya', label: 'Laporan Saya', icon: ClipboardText },
        { to: '/notifikasi', label: 'Notifikasi', icon: BellSimple, badge: unreadCount },
        {
          to: '/undangan',
          label: 'Undangan Penindak',
          icon: EnvelopeSimple,
          badge: invitationCount,
        },
      ]
    : [];
  const staffItems = [
    ...(user?.role === USER_ROLES.BOARD_ADMIN
      ? [{ to: '/verifikasi', label: 'Verifikasi Board', icon: SealCheck }]
      : []),
    ...(user?.role === USER_ROLES.ADMIN
      ? [{ to: '/admin', label: 'Panel Admin', icon: ShieldStar }]
      : []),
  ];

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavItem key={item.to} item={item} />
      ))}
      <NavSection title="Akun" items={accountItems} />
      <NavSection title="Staf" items={staffItems} />
      {user && follows.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <h2 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Board diikuti
          </h2>
          <ul className="flex flex-col gap-1">
            {follows.map(({ board }) => (
              <li key={board.id ?? board.slug}>
                <NavLink
                  to={`/b/${board.slug}`}
                  className={({ isActive }) =>
                    cn(
                      'block truncate rounded-base px-3 py-2 text-sm',
                      isActive ? 'bg-surface text-brand' : 'text-text-muted hover:bg-surface',
                    )
                  }
                >
                  {board.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
