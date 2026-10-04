import { Link } from 'react-router';
import { Card } from '../ui/index.js';
import { ScopeBadge, TrustBadge, VerificationBadge } from './BoardBadges.jsx';

export function BoardCard({ board, compact = false }) {
  return (
    <Card
      as={Link}
      to={`/b/${board.slug}`}
      className="block transition-colors hover:border-brand/40 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="truncate font-semibold text-text">{board.name}</h2>
            <VerificationBadge verification={board.verification} />
          </div>
          <p className="mt-1 text-sm text-text-muted">{board.city}</p>
        </div>
        <ScopeBadge type={board.type} />
      </div>
      {!compact && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
          <TrustBadge label={board.trustLabel} />
          <span>{board.followerCount ?? 0} pengikut</span>
          <span>{board.activeReportCount ?? 0} laporan aktif</span>
        </div>
      )}
    </Card>
  );
}
