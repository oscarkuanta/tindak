import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChartBar, DotsThree, FlagBanner, GearSix } from '@phosphor-icons/react';
import { useMe } from '../../features/auth/hooks.js';
import { useLoginPrompt } from '../../features/auth/loginPromptContext.js';
import { useToast } from '../../features/boards/toastContext.js';
import { FlagModal } from '../moderation/FlagModal.jsx';

const ITEM_CLASS =
  'flex w-full items-center gap-2 rounded-base px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted';

export function BoardMenu({ board }) {
  const { data: user } = useMe();
  const { openLoginPrompt } = useLoginPrompt();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();
  const role = board.viewer?.role;
  const isMember = role === 'OWNER' || role === 'HANDLER';

  useEffect(() => {
    if (!open) return undefined;
    function handlePointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
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

  function startFlag() {
    setOpen(false);
    if (!user) {
      openLoginPrompt({ title: 'Masuk untuk menandai pelanggaran' });
      return;
    }
    setFlagOpen(true);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Opsi Board"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-sm hover:bg-surface-muted hover:text-text"
      >
        <DotsThree aria-hidden="true" size={24} weight="bold" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 rounded-card border border-border bg-surface p-1 shadow-card"
        >
          {isMember && (
            <Link
              role="menuitem"
              to={`/b/${board.slug}/dashboard`}
              className={ITEM_CLASS}
              onClick={() => setOpen(false)}
            >
              <ChartBar aria-hidden="true" size={18} weight="duotone" className="text-brand" />
              Dashboard Statistik
            </Link>
          )}
          {role === 'OWNER' && (
            <Link
              role="menuitem"
              to={`/b/${board.slug}/pengaturan`}
              className={ITEM_CLASS}
              onClick={() => setOpen(false)}
            >
              <GearSix aria-hidden="true" size={18} weight="duotone" className="text-brand" />
              Pengaturan Board
            </Link>
          )}
          {!isMember && (
            <button
              type="button"
              role="menuitem"
              onClick={startFlag}
              className={`${ITEM_CLASS} text-danger hover:bg-red-50`}
            >
              <FlagBanner aria-hidden="true" size={18} weight="fill" />
              Tandai Pelanggaran
            </button>
          )}
        </div>
      )}
      {user && !isMember && (
        <FlagModal
          open={flagOpen}
          onClose={() => setFlagOpen(false)}
          targetType="BOARD"
          targetId={board.id}
          onFlagged={(flag) =>
            showToast(
              flag.hidden
                ? 'Terima kasih. Konten ini disembunyikan sambil ditinjau moderator.'
                : 'Terima kasih. Tanda kamu akan ditinjau moderator.',
            )
          }
        />
      )}
    </div>
  );
}
