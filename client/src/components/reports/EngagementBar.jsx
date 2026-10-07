import { useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { REACTION_META, REACTION_TYPES } from '@tindak/shared';
import { cn } from '../../lib/cn.js';
import { useMe } from '../../features/auth/hooks.js';
import { useLoginPrompt } from '../../features/auth/loginPromptContext.js';
import {
  reactToReport,
  removeReaction,
  supportReport,
  withdrawSupport,
} from '../../features/engagement/api.js';
import {
  chooseReaction,
  stateFromReport,
  toggleSupport,
} from '../../features/engagement/engagementState.js';
import { savePendingAction, takePendingAction } from '../../features/engagement/pendingAction.js';

const LOGIN_TITLE = 'Masuk untuk mendukung laporan ini';
const LOCKED_REASON = 'Laporan sudah ditutup, dukungan dan reaksi dikunci';
const OWN_REPORT_REASON = 'Kamu pelapor laporan ini, dukunganmu sudah dihitung';

const PILL =
  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';

function fromServer(data) {
  return {
    supportCount: data.supportCount,
    reactionCounts: data.reactionCounts,
    mySupport: data.mySupport,
    myReaction: data.myReaction,
  };
}

export function EngagementBar({ report, className }) {
  const { data: user } = useMe();
  const { openLoginPrompt } = useLoginPrompt();
  const queryClient = useQueryClient();
  const [state, setState] = useState(() => stateFromReport(report));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const pendingChecked = useRef(false);
  const popoverId = useId();

  const locked = Boolean(report.isEngagementLocked);
  const ownReport = Boolean(report.isOwnReport);
  const reportKey = `${report.id}:${report.supportCount}:${report.mySupport}:${report.myReaction}`;
  const [syncedKey, setSyncedKey] = useState(reportKey);
  if (syncedKey !== reportKey && !pending) {
    setSyncedKey(reportKey);
    setState(stateFromReport(report));
  }

  async function run(nextState, request) {
    const previous = state;
    setState(nextState);
    setPending(true);
    setError('');
    try {
      const response = await request();
      setState(fromServer(response.data));
      queryClient.invalidateQueries({ queryKey: ['reports', report.id] });
    } catch (requestError) {
      setState(previous);
      setError(requestError?.message ?? 'Gagal menyimpan, coba lagi.');
    } finally {
      setPending(false);
    }
  }

  function doSupport(current = state) {
    return run(toggleSupport(current), () =>
      current.mySupport ? withdrawSupport(report.id) : supportReport(report.id),
    );
  }

  function doReact(type, current = state) {
    const next = chooseReaction(current, type);
    return run(next, () =>
      next.myReaction ? reactToReport(report.id, next.myReaction) : removeReaction(report.id),
    );
  }

  function askLogin(action) {
    savePendingAction({ reportId: report.id, ...action });
    openLoginPrompt({ title: LOGIN_TITLE });
  }

  useEffect(() => {
    if (!user || pendingChecked.current || locked) return;
    pendingChecked.current = true;
    const action = takePendingAction(report.id);
    if (!action) return;
    const current = stateFromReport(report);
    queueMicrotask(() => {
      if (action.action === 'support' && !current.mySupport && !ownReport) doSupport(current);
      if (action.action === 'react' && current.myReaction !== action.type) {
        doReact(action.type, current);
      }
    });
  });

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

  function handleSupportClick() {
    if (!user) return askLogin({ action: 'support' });
    doSupport();
  }

  function handleReactionToggle() {
    if (!user) return askLogin({ action: 'react', type: REACTION_TYPES[0] });
    setOpen((value) => !value);
  }

  function handlePick(type) {
    setOpen(false);
    if (!user) return askLogin({ action: 'react', type });
    doReact(type);
  }

  const supportDisabled = locked || (Boolean(user) && ownReport);
  const supportTitle = locked
    ? LOCKED_REASON
    : user && ownReport
      ? OWN_REPORT_REASON
      : 'Saya juga mengalami ini';
  const selected = state.myReaction ? REACTION_META[state.myReaction] : null;

  return (
    <div ref={rootRef} className={cn('relative flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        onClick={handleSupportClick}
        disabled={supportDisabled || pending}
        title={supportTitle}
        aria-pressed={state.mySupport}
        aria-label={`Dukung, ${state.supportCount} dukungan`}
        className={cn(
          PILL,
          state.mySupport
            ? 'border-brand bg-brand-soft text-brand'
            : 'border-border bg-surface text-text hover:bg-surface-muted',
        )}
      >
        <span aria-hidden="true">⬆️</span>
        Dukung
        <span className="font-semibold">{state.supportCount}</span>
      </button>

      <button
        type="button"
        onClick={handleReactionToggle}
        disabled={locked || pending}
        title={locked ? LOCKED_REASON : 'Beri reaksi'}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={popoverId}
        className={cn(
          PILL,
          selected
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-border bg-surface text-text hover:bg-surface-muted',
        )}
      >
        <span aria-hidden="true">{selected ? selected.emoji : '😊'}</span>
        {selected ? selected.label : 'Reaksi'}
      </button>

      <p className="text-xs text-text-muted" aria-label="Jumlah reaksi">
        {REACTION_TYPES.map(
          (type) => `${REACTION_META[type].emoji} ${state.reactionCounts[type]}`,
        ).join(' · ')}
      </p>

      {open && (
        <div
          id={popoverId}
          role="group"
          aria-label="Pilih reaksi"
          className="absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-card border border-border bg-surface p-2 shadow-card"
        >
          {REACTION_TYPES.map((type) => {
            const meta = REACTION_META[type];
            const active = state.myReaction === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handlePick(type)}
                title={meta.description}
                aria-pressed={active}
                className={cn(
                  'flex w-20 flex-col items-center gap-1 rounded-base px-2 py-1.5 text-xs',
                  active ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-muted',
                )}
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  {meta.emoji}
                </span>
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="w-full text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
