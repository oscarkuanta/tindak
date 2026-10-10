import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Avatar } from '../../components/ui/index.js';
import { USER_ROLES } from '@tindak/shared';
import { useLogout } from '../../features/auth/hooks.js';
import { useMyInvitations } from '../../features/invitations/hooks.js';
import { useLoginPrompt } from '../../features/auth/loginPromptContext.js';

const ITEM_CLASS =
  'block w-full rounded-base px-3 py-2 text-left text-sm hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none';

export function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const menuId = useId();
  const navigate = useNavigate();
  const logoutMutation = useLogout();
  const { closeLoginPrompt } = useLoginPrompt();
  const invitationsQuery = useMyInvitations({ enabled: Boolean(user) && open });
  const invitationCount = invitationsQuery.data?.data?.length ?? 0;

  useEffect(() => {
    if (!open) return undefined;
    function handlePointer(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    navigate('/', { replace: true });
    await logoutMutation.mutateAsync();
    closeLoginPrompt();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Menu akun ${user.name}`}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border-2 border-surface/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
      >
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-card border border-border bg-surface p-2 text-text shadow-card"
        >
          <div className="flex items-center gap-3 border-b border-border px-3 pt-2 pb-3">
            <Avatar name={user.name} src={user.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 pt-2">
            <Link
              role="menuitem"
              to="/profil"
              className={`${ITEM_CLASS} text-text`}
              onClick={() => setOpen(false)}
            >
              Profil
            </Link>
            <Link
              role="menuitem"
              to="/board-saya"
              className={`${ITEM_CLASS} text-text`}
              onClick={() => setOpen(false)}
            >
              Board Saya
            </Link>
            <Link
              role="menuitem"
              to="/undangan"
              className={`${ITEM_CLASS} flex items-center justify-between text-text`}
              onClick={() => setOpen(false)}
            >
              <span>Undangan Penindak</span>
              {invitationCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-xs font-semibold text-brand-contrast">
                  {invitationCount > 99 ? '99+' : invitationCount}
                </span>
              )}
            </Link>
            {user.role === USER_ROLES.BOARD_ADMIN && (
              <Link
                role="menuitem"
                to="/verifikasi"
                className={`${ITEM_CLASS} text-text`}
                onClick={() => setOpen(false)}
              >
                Verifikasi Board
              </Link>
            )}
            {user.role === USER_ROLES.ADMIN && (
              <Link
                role="menuitem"
                to="/admin"
                className={`${ITEM_CLASS} text-text`}
                onClick={() => setOpen(false)}
              >
                Panel Admin
              </Link>
            )}
            <button
              role="menuitem"
              type="button"
              className={`${ITEM_CLASS} text-danger`}
              disabled={logoutMutation.isPending}
              onClick={handleLogout}
            >
              {logoutMutation.isPending ? 'Memproses...' : 'Keluar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
