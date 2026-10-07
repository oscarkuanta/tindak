import { useLocation } from 'react-router';
import { AUTH_PATHS } from '@tindak/shared';
import { ButtonLink } from '../../components/ui/index.js';
import { Button } from '../../components/ui/Button.jsx';
import { useMe } from '../../features/auth/hooks.js';
import { loginPath } from '../../features/auth/returnTo.js';
import { useLoginPrompt } from '../../features/auth/loginPromptContext.js';
import { Logo } from './Logo.jsx';
import { BoardSearch } from './BoardSearch.jsx';
import { UserMenu } from './UserMenu.jsx';
import { NotificationBell } from '../../components/notifications/NotificationBell.jsx';

function CreateBoardAction() {
  const { data: user, isPending } = useMe();
  const { openLoginPrompt } = useLoginPrompt();
  if (isPending) return null;
  if (user)
    return (
      <ButtonLink to="/buat-board" size="sm">
        + Buat Board
      </ButtonLink>
    );
  return (
    <Button size="sm" onClick={() => openLoginPrompt({ title: 'Masuk untuk membuat Board' })}>
      + Buat Board
    </Button>
  );
}

function AuthActions() {
  const { data: user, isPending } = useMe();
  const location = useLocation();

  if (isPending) {
    return (
      <span className="size-8 animate-pulse rounded-full bg-surface-muted" aria-hidden="true" />
    );
  }
  if (user) {
    return (
      <>
        <NotificationBell />
        <UserMenu user={user} />
      </>
    );
  }

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
  const location = useLocation();
  const boardMatch = location.pathname.match(/^\/b\/([^/]+)/);
  const reportPath = boardMatch ? `/b/${boardMatch[1]}/lapor` : '/lapor';

  return (
    <header className="sticky top-0 z-40 h-header border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-layout items-center gap-4 px-4">
        <Logo />
        <div className="flex min-w-0 flex-1 justify-center" data-slot="search">
          <BoardSearch />
        </div>
        <div className="flex shrink-0 items-center gap-2" data-slot="actions">
          <ButtonLink to={reportPath} variant="secondary" size="sm">
            Laporkan Masalah
          </ButtonLink>
          <CreateBoardAction />
          <AuthActions />
        </div>
      </div>
    </header>
  );
}
