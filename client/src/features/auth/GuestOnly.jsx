import { Navigate, Outlet, useSearchParams } from 'react-router';
import { Spinner } from '../../components/ui/index.js';
import { useMe } from './hooks.js';
import { safeReturnTo } from './returnTo.js';

export function GuestOnly() {
  const { data: user, isPending } = useMe();
  const [searchParams] = useSearchParams();

  if (isPending) return <Spinner />;
  if (user) return <Navigate to={safeReturnTo(searchParams.get('returnTo'))} replace />;
  return <Outlet />;
}
