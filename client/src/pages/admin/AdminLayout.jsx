import { Link, NavLink, Outlet } from 'react-router';
import { USER_ROLES } from '@tindak/shared';
import { Spinner } from '../../components/ui/index.js';
import { useMe } from '../../features/auth/hooks.js';

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
    return (
      <section className="mx-auto max-w-2xl rounded-card border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-bold">403 · Akses ditolak</h1>
        <p className="mt-2 text-sm text-text-muted">Panel Admin hanya untuk Admin platform.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Kembali ke Beranda
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Panel Admin</h1>
      <nav
        aria-label="Menu Panel Admin"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${isActive ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`
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
