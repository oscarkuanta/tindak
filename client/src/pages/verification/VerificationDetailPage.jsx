import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { BOARD_TYPE_LABELS, FLAG_REASON_META } from '@tindak/shared';
import { Alert, Button, Card, Spinner } from '../../components/ui/index.js';
import { TrustBadge, VerificationBadge } from '../../components/boards/BoardBadges.jsx';
import { formatPercent, formatScore } from '../../components/boards/trustFormat.js';
import { QuickTagSummary, StarDistribution } from '../../components/trust/StarDistribution.jsx';
import { VerificationTimeline } from '../../components/trust/VerificationTimeline.jsx';
import { RevokeModal, SkipModal, VerifyModal } from '../../components/trust/VerificationModals.jsx';
import { useVerificationDetail } from '../../features/trust/hooks.js';
import { formatDateTime } from '../admin/adminFormat.js';

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Checklist({ items }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-surface ${item.passed ? 'bg-success' : 'bg-danger'}`}
          >
            {item.passed ? '✓' : '✕'}
          </span>
          <span>
            <span className="sr-only">{item.passed ? 'Terpenuhi: ' : 'Belum terpenuhi: '}</span>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function VerificationDetailPage() {
  const { slug } = useParams();
  const query = useVerificationDetail(slug);
  const [modal, setModal] = useState(null);

  if (query.isPending) return <Spinner label="Memuat detail Board" />;
  if (query.isError) return <Alert>{query.error.message}</Alert>;

  const board = query.data.data;
  const failed = board.checklist
    .filter((item) => !item.passed && item.key !== 'COMMUNITY')
    .map((item) => item.label);
  const flagEntries = Object.entries(board.flags ?? {});
  const canVerify = board.verification === 'COMMUNITY' && board.status !== 'FROZEN';

  return (
    <>
      <Link to="/verifikasi" className="text-sm font-medium text-brand hover:underline">
        ← Dashboard Verifikasi
      </Link>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{board.name}</h1>
          <VerificationBadge verification={board.verification} />
          <TrustBadge label={board.trustLabel} score={board.trustScore} />
        </div>
        <p className="text-sm text-text-muted">
          {board.city} · {BOARD_TYPE_LABELS[board.type]} · umur {board.ageDays} hari ·{' '}
          {board.followerCount} pengikut
        </p>
        <p className="text-sm">
          Pemilik: {board.owner?.name} ({board.owner?.email})
          {board.managerTitle && ` · ${board.managerTitle}`}
        </p>
        <p className="whitespace-pre-wrap text-sm text-text-muted">{board.description}</p>
        {board.needsReview && (
          <Alert tone="warning">Board Official ini Perlu Ditinjau Ulang.</Alert>
        )}
        <div className="flex flex-wrap gap-2">
          {canVerify && <Button onClick={() => setModal('verify')}>Jadikan Official</Button>}
          {canVerify && (
            <Button variant="secondary" onClick={() => setModal('skip')}>
              Lewati
            </Button>
          )}
          {board.verification === 'OFFICIAL' && (
            <Button variant="danger" onClick={() => setModal('revoke')}>
              Cabut Official
            </Button>
          )}
          <Link
            to={`/b/${board.slug}`}
            className="inline-flex h-10 items-center px-2 text-sm font-semibold text-brand hover:underline"
          >
            Lihat halaman Board
          </Link>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Syarat kandidat Official</h2>
          <Checklist items={board.checklist} />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Rating ({board.ratingCount})</h2>
          <StarDistribution distribution={board.distribution} total={board.ratingCount} />
          <div className="mt-3">
            <QuickTagSummary quickTags={board.quickTags} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Statistik</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Skor Kepercayaan">{formatScore(board.trustScore) ?? '-'}</Row>
            <Row label="Rata-rata bintang">{formatScore(board.averageStars) ?? '-'}</Row>
            <Row label="Tingkat tanggap">{formatPercent(board.responseRate)}</Row>
            <Row label="Laporan ditolak">{formatPercent(board.rejectedPercentage)}</Row>
            <Row label="Total laporan">{board.reports.total}</Row>
            <Row label="Laporan selesai">{board.reports.resolved}</Row>
            <Row label="Dipulihkan moderator">{board.restoredByAdminCount}</Row>
            <Row label="Kandidat sejak">{formatDateTime(board.candidateSince)}</Row>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Tanda pelanggaran Board</h2>
          {flagEntries.length === 0 ? (
            <p className="text-sm text-text-muted">Belum pernah ditandai.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {flagEntries.map(([reason, count]) => (
                <li key={reason} className="flex justify-between gap-3">
                  <span>
                    {FLAG_REASON_META[reason]?.emoji} {FLAG_REASON_META[reason]?.label ?? reason}
                  </span>
                  <span className="text-text-muted">
                    {count.open} terbuka / {count.total} total
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Riwayat verifikasi</h2>
        <VerificationTimeline entries={board.history} />
      </Card>

      {modal === 'verify' && (
        <VerifyModal board={board} failedRequirements={failed} onClose={() => setModal(null)} />
      )}
      {modal === 'skip' && <SkipModal board={board} onClose={() => setModal(null)} />}
      {modal === 'revoke' && <RevokeModal board={board} onClose={() => setModal(null)} />}
    </>
  );
}
