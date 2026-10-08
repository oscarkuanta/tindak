import { useEffect, useId, useRef, useState } from 'react';
import { useMe } from '../../features/auth/hooks.js';
import { useLoginPrompt } from '../../features/auth/loginPromptContext.js';
import { useToast } from '../../features/boards/toastContext.js';
import { FlagModal } from './FlagModal.jsx';
import { DotsThree, FlagBanner } from '@phosphor-icons/react';

export function FlagButton({ targetType, targetId, label = 'Opsi lainnya' }) {
  const { data: user } = useMe();
  const { openLoginPrompt } = useLoginPrompt();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return undefined;
    function handlePointer(event) {
      if (!containerRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function handleKey(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  function startFlag() {
    setMenuOpen(false);
    if (!user) {
      openLoginPrompt({ title: 'Masuk untuk menandai pelanggaran' });
      return;
    }
    setModalOpen(true);
  }

  function handleFlagged(flag) {
    showToast(
      flag.hidden
        ? 'Terima kasih. Konten ini disembunyikan sambil ditinjau moderator.'
        : 'Terima kasih. Tanda kamu akan ditinjau moderator.',
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((value) => !value)}
        className="inline-flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted"
      >
        <DotsThree aria-hidden="true" size={22} weight="bold" />
      </button>
      {menuOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-1 w-52 rounded-card border border-border bg-surface p-1 shadow-card"
        >
          <button
            type="button"
            role="menuitem"
            onClick={startFlag}
            className="flex w-full items-center gap-2 rounded-base px-3 py-2 text-left text-sm font-medium text-danger hover:bg-red-50"
          >
            <FlagBanner aria-hidden="true" size={16} weight="fill" />
            Tandai Pelanggaran
          </button>
        </div>
      )}
      {user && (
        <FlagModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          targetType={targetType}
          targetId={targetId}
          onFlagged={handleFlagged}
        />
      )}
    </div>
  );
}
