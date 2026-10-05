import { useEffect, useRef, useState } from 'react';
import { FOLLOW_NOTIFY_LEVELS, FOLLOW_NOTIFY_LEVEL_LABELS } from '@tindak/shared';
import { useLoginPrompt } from '../../features/auth/loginPromptContext.js';
import { useMe } from '../../features/auth/hooks.js';
import { useFollowBoard, useUpdateFollowNotifyLevel } from '../../features/boards/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { Badge, Button } from '../ui/index.js';

export function FollowButton({ board, compact = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { data: user } = useMe();
  const { openLoginPrompt } = useLoginPrompt();
  const { showToast } = useToast();
  const followMutation = useFollowBoard();
  const notifyMutation = useUpdateFollowNotifyLevel(board.slug);
  const isFollowing = board.viewer?.isFollowing ?? board.isFollowing ?? false;
  const notifyLevel = board.viewer?.notifyLevel ?? board.notifyLevel ?? 'ALL';
  const memberRole = board.viewer?.role;

  useEffect(() => {
    if (!menuOpen) return undefined;
    function handlePointer(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
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

  async function startFollowing(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      openLoginPrompt({ title: 'Masuk untuk mengikuti Board ini' });
      return;
    }
    try {
      await followMutation.mutateAsync({
        slug: board.slug,
        following: true,
        board,
        notifyLevel: 'ALL',
      });
    } catch (error) {
      showToast(error.message || 'Board belum dapat diikuti.', 'danger');
    }
  }

  async function stopFollowing() {
    try {
      await followMutation.mutateAsync({ slug: board.slug, following: false, board });
      setMenuOpen(false);
    } catch (error) {
      showToast(error.message || 'Board belum dapat berhenti diikuti.', 'danger');
    }
  }

  async function changeNotifyLevel(value) {
    try {
      await notifyMutation.mutateAsync(value);
      setMenuOpen(false);
    } catch (error) {
      showToast(error.message || 'Pengaturan notifikasi belum dapat disimpan.', 'danger');
    }
  }

  if (memberRole === 'OWNER' || memberRole === 'HANDLER') {
    return (
      <Badge tone="neutral" aria-label="Kamu merupakan Penindak Board ini">
        {memberRole === 'OWNER' ? 'Penindak Utama' : 'Penindak'}
      </Badge>
    );
  }

  if (!isFollowing) {
    return (
      <Button
        size={compact ? 'sm' : 'md'}
        variant="secondary"
        onClick={startFollowing}
        loading={followMutation.isPending}
      >
        Ikuti
      </Button>
    );
  }

  return (
    <div ref={menuRef} className="relative" onClick={(event) => event.stopPropagation()}>
      <Button
        size={compact ? 'sm' : 'md'}
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        loading={followMutation.isPending}
      >
        Diikuti <span aria-hidden="true">⌄</span>
      </Button>
      {menuOpen && (
        <div
          role="menu"
          aria-label="Pengaturan ikuti Board"
          className="absolute right-0 z-20 mt-2 w-56 rounded-card border border-border bg-surface p-2 shadow-card"
        >
          <p className="px-2 py-1 text-xs font-semibold text-text-muted">Notifikasi</p>
          {FOLLOW_NOTIFY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="menuitemradio"
              aria-checked={notifyLevel === level}
              className="flex w-full items-center justify-between rounded-base px-2 py-2 text-left text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand"
              disabled={notifyMutation.isPending}
              onClick={() => changeNotifyLevel(level)}
            >
              {FOLLOW_NOTIFY_LEVEL_LABELS[level]}
              <span aria-hidden="true">{notifyLevel === level ? '✓' : ''}</span>
            </button>
          ))}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-base px-2 py-2 text-left text-sm text-danger hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand"
            disabled={followMutation.isPending}
            onClick={stopFollowing}
          >
            Berhenti mengikuti
          </button>
        </div>
      )}
    </div>
  );
}
