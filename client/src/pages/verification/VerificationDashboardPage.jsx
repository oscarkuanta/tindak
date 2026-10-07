import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { BOARD_TYPE_LABELS } from '@tindak/shared';
import { Button, Card, Input } from '../../components/ui/index.js';
import { OfficialBadge, TrustBadge } from '../../components/boards/BoardBadges.jsx';
import { formatPercent, formatScore } from '../../components/boards/trustFormat.js';
import { RevokeModal } from '../../components/trust/VerificationModals.jsx';
import {
  useBoardAdminStats,
  useCandidates,
  useOfficialBoards,
} from '../../features/trust/hooks.js';
import { Pager, QueryState } from '../admin/adminShared.jsx';
import { formatDateTime } from '../admin/adminFormat.js';

const TABS = [
  { key: 'kandidat', label: 'Kandidat' },
  { key: 'official', label: 'Official' },
];

const TH = 'px-3 py-2 text-left text-xs font-medium text-text-muted';
const TD = 'px-3 py-2 text-sm';

function Stat({ label, value }) {
  return (
    <Card>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value ?? '-'}</p>
    </Card>
  );
}

function StatsRow() {
  const query = useBoardAdminStats();
  const stats = query.data?.data;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Stat label="Kandidat Official" value={stats?.candidates} />
      <Stat label="Board Official" value={stats?.official} />
      <Stat label="Dicabut 30 hari" value={stats?.revokedLast30Days} />
      <Stat label="Perlu Ditinjau Ulang" value={stats?.needsReview} />
    </div>
  );
}

function CandidatesTab() {
  const [page, setPage] = useState(1);
  const query = useCandidates({ page });
  const navigate = useNavigate();

  return (
    <QueryState query={query} empty="Belum ada Board yang memenuhi syarat kandidat.">
      {(boards, meta) => (
        <>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[40rem]">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Board</th>
                  <th className={TH}>Jenis</th>
                  <th className={TH}>Rating</th>
                  <th className={TH}>Skor</th>
                  <th className={TH}>Tanggap</th>
                  <th className={TH}>Umur</th>
                  <th className={TH}>Kandidat sejak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {boards.map((board) => (
                  <tr
                    key={board.id}
                    onClick={() => navigate(`/verifikasi/${board.slug}`)}
                    className="cursor-pointer hover:bg-surface-muted"
                  >
                    <td className={TD}>
                      <Link
                        to={`/verifikasi/${board.slug}`}
                        className="font-semibold hover:text-brand"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {board.name}
                      </Link>
                      <span className="block text-xs text-text-muted">{board.city}</span>
                    </td>
                    <td className={TD}>{BOARD_TYPE_LABELS[board.type]}</td>
                    <td className={TD}>{board.ratingCount}</td>
                    <td className={TD}>{formatScore(board.trustScore)}</td>
                    <td className={TD}>{formatPercent(board.responseRate)}</td>
                    <td className={TD}>{board.ageDays} hari</td>
                    <td className={TD}>{formatDateTime(board.candidateSince)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pager meta={meta} page={page} onPage={setPage} />
        </>
      )}
    </QueryState>
  );
}

function OfficialTab() {
  const [filters, setFilters] = useState({ q: '', review: false, page: 1 });
  const [revoking, setRevoking] = useState(null);
  const query = useOfficialBoards(filters);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <Input
            aria-label="Cari Board Official"
            placeholder="Cari nama Board"
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-brand"
            checked={filters.review}
            onChange={(event) => setFilters({ ...filters, review: event.target.checked, page: 1 })}
          />
          Hanya Perlu Ditinjau Ulang
        </label>
      </div>
      <QueryState query={query} empty="Tidak ada Board Official.">
        {(boards, meta) => (
          <>
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[40rem]">
                <thead className="border-b border-border">
                  <tr>
                    <th className={TH}>Board</th>
                    <th className={TH}>Skor</th>
                    <th className={TH}>Rating</th>
                    <th className={TH}>Diverifikasi</th>
                    <th className={TH}>
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {boards.map((board) => (
                    <tr key={board.id}>
                      <td className={TD}>
                        <Link
                          to={`/verifikasi/${board.slug}`}
                          className="font-semibold hover:text-brand"
                        >
                          {board.name}
                        </Link>
                        <span className="block text-xs text-text-muted">{board.city}</span>
                        {board.needsReview && (
                          <span className="text-xs font-semibold text-danger">
                            Perlu Ditinjau Ulang
                          </span>
                        )}
                      </td>
                      <td className={TD}>
                        <TrustBadge label={board.trustLabel} score={board.trustScore} />
                      </td>
                      <td className={TD}>{board.ratingCount}</td>
                      <td className={TD}>
                        {formatDateTime(board.verifiedAt)}
                        {board.verifiedBy && (
                          <span className="block text-xs text-text-muted">
                            oleh {board.verifiedBy.name}
                          </span>
                        )}
                      </td>
                      <td className={`${TD} text-right`}>
                        <Button variant="danger" size="sm" onClick={() => setRevoking(board)}>
                          Cabut
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Pager
              meta={meta}
              page={filters.page}
              onPage={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </QueryState>
      {revoking && <RevokeModal board={revoking} onClose={() => setRevoking(null)} />}
    </div>
  );
}

export function VerificationDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'official' ? 'official' : 'kandidat';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Dashboard Verifikasi</h1>
        <OfficialBadge />
      </div>
      <StatsRow />
      <nav
        role="tablist"
        aria-label="Daftar verifikasi"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setSearchParams(item.key === 'kandidat' ? {} : { tab: item.key })}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === item.key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {tab === 'kandidat' ? <CandidatesTab /> : <OfficialTab />}
    </>
  );
}
