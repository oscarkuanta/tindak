import { NavLink, Outlet } from 'react-router';
import { USER_ROLES } from '@tindak/shared';
import { Spinner } from '../../components/ui/index.js';
import { useMe } from '../../features/auth/hooks.js';
import { StaffRedirect } from '../../features/auth/StaffRedirect.jsx';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/moderasi', label: 'Antrean Moderasi' },
  { to: '/admin/ban', label: 'Daftar Ban' },
  { to: '/admin/board', label: 'Kelola Board' },
  { to: '/admin/user', label: 'Kelola User' },
  { to: '/admin/audit', label: 'Audit Log' },
];

export function AdminLayout() {
  const { data: user, isPending } = useMe();
  if (isPending) return <Spinner />;
  if (user?.role !== USER_ROLES.ADMIN) {
    return <StaffRedirect message="Panel Admin hanya untuk Admin platform." />;
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Panel Admin</h1>
      <nav aria-label="Menu Panel Admin" className="tabs-pill">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-soft text-mint-700' : 'text-text-muted hover:bg-surface-muted hover:text-text'}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </section>
  );
}
