import { useState } from 'react';
import { Button, Card } from '../ui/index.js';
import { TrustBadge } from '../boards/BoardBadges.jsx';
import { formatPercent, formatScore } from '../boards/trustFormat.js';
import { useMe } from '../../features/auth/hooks.js';
import { useLoginPrompt } from '../../features/auth/loginPromptContext.js';
import { useRatingSummary } from '../../features/trust/hooks.js';
import { QuickTagSummary, StarDistribution } from './StarDistribution.jsx';
import { RatingModal } from './RatingModal.jsx';

export function TrustPanel({ board }) {
  const { data: user } = useMe();
  const { openLoginPrompt } = useLoginPrompt();
  const summaryQuery = useRatingSummary(board.slug);
  const summary = summaryQuery.data?.data;
  const [open, setOpen] = useState(false);
  const isStaff = Boolean(board.viewer?.role);

  function handleRate() {
    if (!user) {
      openLoginPrompt({ title: 'Masuk untuk memberi rating' });
      return;
    }
    setOpen(true);
  }

  return (
    <Card>
      <h2 className="font-semibold">Skor Kepercayaan</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-3xl font-bold">{formatScore(board.trustScore) ?? '-'}</p>
        <TrustBadge label={board.trustLabel} score={board.trustScore} />
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {board.ratingCount ?? 0} rating
        {board.averageStars ? ` · rata-rata ${formatScore(board.averageStars)} ★` : ''}
      </p>
      <details className="mt-2 text-xs text-text-muted">
        <summary className="cursor-pointer font-medium text-brand">Cara skor dihitung</summary>
        <p className="mt-1">
          Skor dihitung otomatis dari rating bintang pengguna (60%) dan seberapa cepat Penindak
          menanggapi laporan dalam 7 hari (40%). Board dengan sedikit rating dianggap mulai dari
          bintang 3, jadi butuh banyak rating untuk mendapat skor tinggi. Skor ini berbeda dari
          centang Official yang diberikan manual oleh Admin Board.
        </p>
      </details>
      {summary && board.ratingCount > 0 && (
        <div className="mt-4 space-y-3">
          <StarDistribution distribution={summary.distribution} total={summary.ratingCount} />
          <QuickTagSummary quickTags={summary.quickTags} />
        </div>
      )}
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">Tingkat tanggap</dt>
          <dd>{formatPercent(board.responseRate)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">Laporan ditolak</dt>
          <dd>{formatPercent(board.rejectedPercentage)}</dd>
        </div>
        {board.restoredByAdminCount > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Laporan dipulihkan moderator</dt>
            <dd>{board.restoredByAdminCount}</dd>
          </div>
        )}
      </dl>
      {!isStaff && (
        <Button variant="secondary" block className="mt-4" onClick={handleRate}>
          ⭐ Beri Rating
        </Button>
      )}
      {user && <RatingModal slug={board.slug} open={open} onClose={() => setOpen(false)} />}
    </Card>
  );
}
