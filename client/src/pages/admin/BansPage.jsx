import { useState } from 'react';
import { BAN_TARGET_LABELS } from '@tindak/shared';
import { Badge, Button, Card } from '../../components/ui/index.js';
import { useBans, useRevokeBan } from '../../features/moderation/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { apiErrorMessage } from '../../features/auth/formErrors.js';
import { Pager, QueryState } from './adminShared.jsx';
import { SELECT_CLASS, formatDateTime } from './adminFormat.js';

function BanRow({ ban }) {
  const revoke = useRevokeBan();
  const { showToast } = useToast();

  async function handleRevoke() {
    try {
      await revoke.mutateAsync(ban.id);
      showToast('Ban dicabut');
    } catch (error) {
      showToast(apiErrorMessage(error), 'danger');
    }
  }

  return (
    <Card className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{BAN_TARGET_LABELS[ban.targetType]}</Badge>
          <span className="font-mono font-semibold">{ban.target}</span>
          {ban.isActive ? <Badge tone="danger">Aktif</Badge> : <Badge>Tidak aktif</Badge>}
        </div>
        <p>{ban.reason}</p>
        <p className="text-xs text-text-muted">
          Dibuat {formatDateTime(ban.createdAt)}
          {ban.createdBy ? ` oleh ${ban.createdBy.name}` : ''} · Berakhir{' '}
          {ban.expiresAt ? formatDateTime(ban.expiresAt) : 'permanen'}
          {ban.revokedAt ? ` · Dicabut ${formatDateTime(ban.revokedAt)}` : ''}
        </p>
      </div>
      {ban.isActive && (
        <Button variant="secondary" size="sm" loading={revoke.isPending} onClick={handleRevoke}>
          Cabut Ban
        </Button>
      )}
    </Card>
  );
}

export function BansPage() {
  const [filters, setFilters] = useState({ active: 'true', page: 1 });
  const query = useBans(filters);

  return (
    <div className="flex flex-col gap-4">
      <select
        aria-label="Filter ban"
        className={`${SELECT_CLASS} self-start`}
        value={filters.active}
        onChange={(event) => setFilters({ active: event.target.value, page: 1 })}
      >
        <option value="true">Ban aktif</option>
        <option value="false">Semua ban</option>
      </select>
      <QueryState query={query} empty="Belum ada ban.">
        {(bans, meta) => (
          <>
            <div className="flex flex-col gap-3">
              {bans.map((ban) => (
                <BanRow key={ban.id} ban={ban} />
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
