import { Outlet } from 'react-router';
import { USER_ROLES } from '@tindak/shared';
import { Spinner } from '../../components/ui/index.js';
import { useMe } from '../../features/auth/hooks.js';
import { StaffRedirect } from '../../features/auth/StaffRedirect.jsx';

export function VerificationLayout() {
  const { data: user, isPending } = useMe();
  if (isPending) return <Spinner />;
  if (user?.role !== USER_ROLES.BOARD_ADMIN) {
    return <StaffRedirect message="Dashboard Verifikasi hanya untuk Admin Board." />;
  }
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5">
      <Outlet />
    </section>
  );
}
