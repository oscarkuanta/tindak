import { NavLink } from 'react-router';
import { Bookmark, Compass, Home, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { useMe } from '../../features/auth/hooks.js';
import { useMyFollows } from '../../features/boards/hooks.js';

export function LeftNav() {
  const { data: user } = useMe();
  const followsQuery = useMyFollows({ enabled: Boolean(user) });
  const follows = followsQuery.data?.data ?? [];
  const navItems = [
    { to: '/', label: 'Beranda', end: true, icon: Home },
    ...(user ? [{ to: '/board-saya', label: 'Board Saya', icon: LayoutGrid }] : []),
    { to: '/board-diikuti', label: 'Board Diikuti', icon: Bookmark },
    { to: '/cari', label: 'Jelajahi Board', icon: Compass },
  ];
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-surface text-mint-700 shadow-card'
                : 'text-text-muted hover:bg-surface',
            )
          }
        >
          <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
      {user && follows.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
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
