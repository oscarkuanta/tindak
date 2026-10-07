import { Link, Outlet } from 'react-router';
import { USER_ROLES } from '@tindak/shared';
import { Spinner } from '../../components/ui/index.js';
import { useMe } from '../../features/auth/hooks.js';

export function VerificationLayout() {
  const { data: user, isPending } = useMe();
  if (isPending) return <Spinner />;
  if (user?.role !== USER_ROLES.BOARD_ADMIN) {
    return (
      <section className="mx-auto max-w-2xl rounded-card border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-bold">403 · Akses ditolak</h1>
        <p className="mt-2 text-sm text-text-muted">
          Dashboard Verifikasi hanya untuk Admin Board.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Kembali ke Beranda
        </Link>
      </section>
    );
  }
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5">
      <Outlet />
    </section>
  );
}
