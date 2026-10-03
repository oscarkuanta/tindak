import { NavLink } from 'react-router';
import { cn } from '../../lib/cn.js';

const NAV_ITEMS = [{ to: '/', label: 'Beranda', end: true }];

export function LeftNav() {
  return (
    <nav className="sticky top-[calc(var(--spacing-header)+1.5rem)] flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'rounded-base px-3 py-2 text-sm font-medium',
              isActive ? 'bg-surface text-brand' : 'text-text-muted hover:bg-surface',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
