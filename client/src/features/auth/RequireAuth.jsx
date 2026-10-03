import { Navigate, Outlet, useLocation } from 'react-router';
import { Spinner } from '../../components/ui/index.js';
import { useMe } from './hooks.js';
import { loginPath } from './returnTo.js';

export function RequireAuth({ children }) {
  const { data: user, isPending } = useMe();
  const location = useLocation();

  if (isPending) return <Spinner />;
  if (!user) {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  }
  return children ?? <Outlet />;
}
