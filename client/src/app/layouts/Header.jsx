import { useLocation } from 'react-router';
import { Megaphone, PlusCircle } from '@phosphor-icons/react';
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
      <ButtonLink to="/buat-board" variant="outlineLight" size="sm" data-slot="create-board">
        <PlusCircle size={18} weight="bold" aria-hidden="true" />
        Buat Board
      </ButtonLink>
    );
  return (
    <Button
      size="sm"
      variant="outlineLight"
      data-slot="create-board"
      onClick={() => openLoginPrompt({ title: 'Masuk untuk membuat Board' })}
    >
      <PlusCircle size={18} weight="bold" aria-hidden="true" />
      Buat Board
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
      <ButtonLink to={loginPath(returnTo)} variant="white" size="sm">
        Masuk
      </ButtonLink>
      <ButtonLink to={AUTH_PATHS.REGISTER} variant="white" size="sm">
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
    <header className="site-header">
      <div className="site-header__inner">
        <Logo />
        <div className="flex min-w-0 flex-1 justify-center" data-slot="search">
          <BoardSearch />
        </div>
        <div className="flex shrink-0 items-center gap-2" data-slot="actions">
          <ButtonLink to={reportPath} variant="accent" size="md" data-slot="top-report">
            <Megaphone size={18} weight="fill" aria-hidden="true" />
            Laporkan Masalah
          </ButtonLink>
          <CreateBoardAction />
          <AuthActions />
        </div>
      </div>
    </header>
  );
}
