import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge, Button, Card, Input } from '../../components/ui/index.js';
import { VerificationBadge } from '../../components/boards/BoardBadges.jsx';
import { FreezeBoardModal } from '../../components/moderation/FreezeBoardModal.jsx';
import { useAdminBoards, useUnfreezeBoard } from '../../features/moderation/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { apiErrorMessage } from '../../features/auth/formErrors.js';
import { Pager, QueryState } from './adminShared.jsx';
import { SELECT_CLASS, formatDateTime } from './adminFormat.js';
import { FlagReasonIcon } from '../../components/icons/AppIcons.jsx';
import { Snowflake, Sun } from '@phosphor-icons/react';

const STATUS_BADGES = {
  ACTIVE: { tone: 'success', label: 'Aktif' },
  INACTIVE: { tone: 'warning', label: 'Tidak Aktif' },
  FROZEN: { tone: 'info', label: 'Di-freeze' },
};

function BoardRow({ board }) {
  const [freezing, setFreezing] = useState(false);
  const unfreeze = useUnfreezeBoard();
  const { showToast } = useToast();
  const status = STATUS_BADGES[board.status];

  async function handleUnfreeze() {
    try {
      await unfreeze.mutateAsync(board.slug);
      showToast('Board di-unfreeze dan aktif lagi');
    } catch (error) {
      showToast(apiErrorMessage(error), 'danger');
    }
  }

  return (
    <Card className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {board.status === 'FROZEN' ? (
            <span className="font-semibold">{board.name}</span>
          ) : (
            <Link to={`/b/${board.slug}`} className="font-semibold hover:text-brand">
              {board.name}
            </Link>
          )}
          <VerificationBadge verification={board.verification} size="sm" />
          {status && <Badge tone={status.tone}>{status.label}</Badge>}
        </div>
        {board.status === 'FROZEN' && (
          <p className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
            <Snowflake aria-hidden="true" size={14} weight="bold" />
            {board.frozenUntil
              ? `Otomatis aktif lagi ${formatDateTime(board.frozenUntil)}`
              : 'Freeze permanen sampai di-unfreeze manual'}
          </p>
        )}
        <p className="text-xs text-text-muted">
          {board.city} · Pemilik {board.owner?.name} · {board.reportCount} laporan
        </p>
        <p className="text-xs text-text-muted">
          {board.openFlagCount} tanda terbuka
          {board.fakeBoardFlagCount > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-danger">
              {' '}
              · <FlagReasonIcon reason="FAKE_BOARD" size={14} /> {board.fakeBoardFlagCount} tanda
              Board palsu
            </span>
          )}
          {board.restoredByAdminCount > 0 &&
            ` · ${board.restoredByAdminCount} laporan dipulihkan moderator`}
        </p>
      </div>
      {board.status === 'FROZEN' ? (
        <Button variant="secondary" size="sm" loading={unfreeze.isPending} onClick={handleUnfreeze}>
          <Sun aria-hidden="true" size={16} weight="bold" />
          Unfreeze
        </Button>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setFreezing(true)}>
          <Snowflake aria-hidden="true" size={16} weight="bold" />
          Freeze
        </Button>
      )}
      {freezing && <FreezeBoardModal board={board} onClose={() => setFreezing(false)} />}
    </Card>
  );
}

export function AdminBoardsPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: '',
    status: searchParams.get('status') ?? '',
    page: 1,
  });
  const query = useAdminBoards(filters);
  const update = (patch) => setFilters((value) => ({ ...value, page: 1, ...patch }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <Input
            aria-label="Cari Board"
            placeholder="Cari nama Board"
            value={filters.q}
            onChange={(event) => update({ q: event.target.value })}
          />
        </div>
        <select
          aria-label="Filter status Board"
          className={SELECT_CLASS}
          value={filters.status}
          onChange={(event) => update({ status: event.target.value })}
        >
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Tidak Aktif</option>
          <option value="FROZEN">Di-freeze</option>
        </select>
      </div>
      <QueryState query={query} empty="Board tidak ditemukan.">
        {(boards, meta) => (
          <>
            <div className="flex flex-col gap-3">
              {boards.map((board) => (
                <BoardRow key={board.id} board={board} />
              ))}
            </div>
            <Pager
              meta={meta}
              page={filters.page}
              onPage={(page) => setFilters((value) => ({ ...value, page }))}
            />
          </>
        )}
      </QueryState>
    </div>
  );
}
