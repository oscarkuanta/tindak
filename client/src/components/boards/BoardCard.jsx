import { Link } from 'react-router';
import { Card } from '../ui/index.js';
import { ScopeBadge, TrustBadge, VerificationBadge } from './BoardBadges.jsx';
import { FollowButton } from './FollowButton.jsx';

export function BoardCard({ board, compact = false, showFollowButton = true }) {
  return (
    <Card className="transition-colors hover:border-brand/40 hover:bg-surface-muted">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          to={`/b/${board.slug}`}
          className="min-w-0 flex-1 rounded-base focus-visible:outline-2 focus-visible:outline-brand"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="truncate font-semibold text-text">{board.name}</h2>
              <VerificationBadge verification={board.verification} />
              {compact && <TrustBadge label={board.trustLabel} score={board.trustScore} />}
            </div>
            <p className="mt-1 text-sm text-text-muted">{board.city}</p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <ScopeBadge type={board.type} />
          {showFollowButton && <FollowButton board={board} compact />}
        </div>
      </div>
      {!compact && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
          <TrustBadge label={board.trustLabel} score={board.trustScore} />
          <span>{board.followerCount ?? 0} pengikut</span>
          <span>{board.activeReportCount ?? 0} laporan aktif</span>
        </div>
      )}
    </Card>
  );
}
