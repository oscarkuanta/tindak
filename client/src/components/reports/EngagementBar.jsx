import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowFatUp } from '@phosphor-icons/react';
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
import { applyMyEngagement } from '../../features/realtime/cacheUpdates.js';
import { ReactionIcon } from '../icons/AppIcons.jsx';

const LOGIN_TITLE = 'Masuk untuk mendukung laporan ini';
const LOCKED_REASON = 'Laporan sudah ditutup, dukungan dan reaksi dikunci';
const OWN_REPORT_REASON = 'Kamu pelapor laporan ini, dukunganmu sudah dihitung';

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
  const [burst, setBurst] = useState(0);
  const pendingChecked = useRef(false);

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
      const saved = fromServer(response.data);
      setState(saved);
      applyMyEngagement(queryClient, report.id, saved);
      queryClient.invalidateQueries({ queryKey: ['reports', report.id] });
    } catch (requestError) {
      setState(previous);
      setError(requestError?.message ?? 'Gagal menyimpan, coba lagi.');
    } finally {
      setPending(false);
    }
  }

  function doSupport(current = state) {
    if (!current.mySupport) setBurst((value) => value + 1);
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

  function handleSupportClick() {
    if (!user) return askLogin({ action: 'support' });
    doSupport();
  }

  function handleReaction(type) {
    if (!user) return askLogin({ action: 'react', type });
    doReact(type);
  }

  const supportDisabled = locked || (Boolean(user) && ownReport);
  const supportTitle = locked
    ? LOCKED_REASON
    : user && ownReport
      ? OWN_REPORT_REASON
      : 'Saya juga mengalami ini';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        onClick={handleSupportClick}
        disabled={supportDisabled || pending}
        title={supportTitle}
        aria-pressed={state.mySupport}
        aria-label={`Dukung, ${state.supportCount} dukungan`}
        className={cn('engage-btn support-btn', state.mySupport && 'is-on')}
      >
        <ArrowFatUp
          key={`icon-${burst}`}
          aria-hidden="true"
          size={18}
          weight={state.mySupport ? 'fill' : 'bold'}
          className={cn('support-btn__icon', burst > 0 && 'is-bouncing')}
        />
        Dukung
        <span key={`count-${state.supportCount}`} className="support-btn__count is-popping">
          {state.supportCount}
        </span>
        {burst > 0 && (
          <span key={`plus-${burst}`} aria-hidden="true" className="support-btn__plus">
            +1
          </span>
        )}
      </button>

      <div role="group" aria-label="Reaksi" className="flex flex-wrap items-center gap-1.5">
        {REACTION_TYPES.map((type) => {
          const meta = REACTION_META[type];
          const active = state.myReaction === type;
          const count = state.reactionCounts[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleReaction(type)}
              disabled={locked || pending}
              title={locked ? LOCKED_REASON : `${meta.label}: ${meta.description}`}
              aria-pressed={active}
              aria-label={`${meta.label}, ${count} reaksi`}
              className={cn('engage-btn reaction-btn', `reaction-btn--${type}`, active && 'is-on')}
            >
              <ReactionIcon type={type} active={active || count > 0} size={15} />
              <span className="font-semibold">{count}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="w-full text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
