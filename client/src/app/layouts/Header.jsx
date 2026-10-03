import { useLocation } from 'react-router';
import { AUTH_PATHS } from '@tindak/shared';
import { ButtonLink } from '../../components/ui/index.js';
import { useMe } from '../../features/auth/hooks.js';
import { loginPath } from '../../features/auth/returnTo.js';
import { Logo } from './Logo.jsx';
import { UserMenu } from './UserMenu.jsx';

function AuthActions() {
  const { data: user, isPending } = useMe();
  const location = useLocation();

  if (isPending) {
    return (
      <span className="size-8 animate-pulse rounded-full bg-surface-muted" aria-hidden="true" />
    );
  }
  if (user) return <UserMenu user={user} />;

  const returnTo = location.pathname + location.search;
  return (
    <>
      <ButtonLink to={loginPath(returnTo)} variant="ghost" size="sm">
        Masuk
      </ButtonLink>
      <ButtonLink to={AUTH_PATHS.REGISTER} size="sm">
        Daftar
      </ButtonLink>
    </>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 h-header border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-layout items-center gap-4 px-4">
        <Logo />
        <div className="flex min-w-0 flex-1 justify-center" data-slot="search" />
        <div className="flex shrink-0 items-center gap-2" data-slot="actions">
          <AuthActions />
        </div>
      </div>
    </header>
  );
}
