import { Link } from 'react-router';
import { MapPin, Tag } from '@phosphor-icons/react';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { ReportSeverityBadge, ReportStatusBadge } from './ReportStatusBadge.jsx';
import { EngagementBar } from './EngagementBar.jsx';
import { VerificationBadge } from '../boards/BoardBadges.jsx';
import { FlagButton } from '../moderation/FlagButton.jsx';
import { BlurredImage } from './BlurredImage.jsx';
import { relativeTime } from '../../lib/relativeTime.js';

function boardInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

export function ReportCard({ report, showBoard = false }) {
  const photo = report.media?.[0] ?? report.photos?.[0];
  const reportUrl = `/laporan/${report.id}`;
  const withBoard = showBoard && report.board;

  return (
    <Card as="article" className="report-card p-0">
      <header className="flex items-center gap-2 px-4 pt-3 sm:px-5">
        {withBoard ? (
          <Link
            to={`/b/${report.board.slug}`}
            className="group flex min-w-0 items-center gap-2 text-sm font-semibold"
          >
            <span aria-hidden="true" className="report-card__board-avatar">
              {boardInitials(report.board.name)}
            </span>
            <span className="truncate group-hover:text-brand">{report.board.name}</span>
          </Link>
        ) : (
          report.category?.name && (
            <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
              <Tag size={14} weight="duotone" aria-hidden="true" />
              {report.category.name}
            </span>
          )
        )}
        {withBoard && <VerificationBadge verification={report.board.verification} size="sm" />}
        <span aria-hidden="true" className="text-text-subtle">
          ·
        </span>
        <time dateTime={report.createdAt} className="shrink-0 text-xs text-text-muted">
          {relativeTime(report.createdAt)}
        </time>
        <div className="ml-auto">
          <FlagButton targetType="REPORT" targetId={report.id} label="Opsi laporan" />
        </div>
      </header>

      <Link
        to={reportUrl}
        className="block rounded-card px-4 pt-2 pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:px-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ReportSeverityBadge severity={report.severity} />
          <ReportStatusBadge status={report.status} />
          {report.isHidden && <Badge>Ditinjau moderator</Badge>}
        </div>
        <h2 className="mt-2 text-lg leading-snug font-bold">{report.title}</h2>
        {report.description && (
          <p className="mt-1 line-clamp-2 text-sm text-text-muted">{report.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          {withBoard && report.category?.name && (
            <span className="flex items-center gap-1">
              <Tag size={14} weight="duotone" aria-hidden="true" />
              {report.category.name}
            </span>
          )}
          {report.locationDetail && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin size={14} weight="duotone" aria-hidden="true" />
              <span className="truncate">{report.locationDetail}</span>
            </span>
          )}
          {report.trackingCode && <span className="font-mono">TND-{report.trackingCode}</span>}
        </div>
        {photo?.url && (
          <BlurredImage
            src={photo.url}
            alt={`Foto laporan: ${report.title}`}
            isBlurred={photo.isBlurred}
            frameClassName="mt-3 aspect-[4/3] w-full rounded-card border border-border sm:aspect-[16/10]"
          />
        )}
      </Link>

      <footer className="border-t border-border px-4 py-3 sm:px-5">
        <EngagementBar report={report} />
      </footer>
    </Card>
  );
}
