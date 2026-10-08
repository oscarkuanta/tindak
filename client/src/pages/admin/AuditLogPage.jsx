import { useState } from 'react';
import { Card } from '../../components/ui/index.js';
import { useAuditLogs } from '../../features/moderation/hooks.js';
import { Pager, QueryState } from './adminShared.jsx';
import { SELECT_CLASS, formatDateTime } from './adminFormat.js';

const ACTION_LABELS = {
  REPORT_AUTO_HIDDEN: 'Laporan disembunyikan otomatis',
  REPORT_RESTORED: 'Laporan dipulihkan',
  REPORT_REMOVED: 'Laporan dihapus',
  BAN_CREATED: 'Ban dibuat',
  BAN_REVOKED: 'Ban dicabut',
  BOARD_FROZEN: 'Board di-freeze',
  BOARD_UNFROZEN: 'Board di-unfreeze',
  BOARD_VERIFICATION_REVOKED_BY_FREEZE: 'Status Official dicabut karena freeze',
  BOARD_FLAGS_DISMISSED: 'Tanda Board diabaikan',
  REPORT_PROCESSED: 'Laporan diproses',
  REPORT_INFO_REQUESTED: 'Minta info pelapor',
  REPORT_REJECTED: 'Laporan ditolak',
  REPORT_MARKED_DUPLICATE: 'Ditandai duplikat',
  REPORT_MARKED_RESOLVED: 'Ditandai selesai',
  REPORT_CONFIRMED_BY_REPORTER: 'Dikonfirmasi pelapor',
  REPORT_AUTO_CONFIRMED: 'Dikonfirmasi otomatis',
  BOARD_HANDLER_INVITED: 'Penindak diundang',
  BOARD_INVITATION_ACCEPTED: 'Undangan Penindak diterima',
  BOARD_INVITATION_DECLINED: 'Undangan Penindak ditolak',
  BOARD_INVITATION_CANCELLED: 'Undangan Penindak dibatalkan',
  BOARD_HANDLER_REMOVED: 'Penindak dikeluarkan',
  BOARD_OWNER_CHANGED: 'Penindak Utama berganti',
};

const TARGET_LABELS = { REPORT: 'Laporan', BOARD: 'Board', BAN: 'Ban', USER: 'User' };

export function AuditLogPage() {
  const [filters, setFilters] = useState({ action: '', targetType: '', page: 1 });
  const query = useAuditLogs(filters);
  const update = (patch) => setFilters((value) => ({ ...value, page: 1, ...patch }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter aksi"
          className={SELECT_CLASS}
          value={filters.action}
          onChange={(event) => update({ action: event.target.value })}
        >
          <option value="">Semua aksi</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter target"
          className={SELECT_CLASS}
          value={filters.targetType}
          onChange={(event) => update({ targetType: event.target.value })}
        >
          <option value="">Semua target</option>
          {Object.entries(TARGET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <QueryState query={query} empty="Belum ada catatan.">
        {(logs, meta) => (
          <>
            <Card className="divide-y divide-border p-0">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{ACTION_LABELS[log.action] ?? log.action}</p>
                    <p className="text-xs text-text-muted">
                      {log.actor?.name ?? 'Sistem'}
                      {log.targetType &&
                        ` · ${TARGET_LABELS[log.targetType] ?? log.targetType} #${log.targetId}`}
                    </p>
                  </div>
                  <time className="text-xs text-text-muted" dateTime={log.createdAt}>
                    {formatDateTime(log.createdAt)}
                  </time>
                </div>
              ))}
            </Card>
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
