import { Link } from 'react-router';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { ReportSeverityBadge, ReportStatusBadge } from './ReportStatusBadge.jsx';
import { EngagementBar } from './EngagementBar.jsx';
import { VerificationBadge } from '../boards/BoardBadges.jsx';
import { FlagButton } from '../moderation/FlagButton.jsx';
import { BlurredImage } from './BlurredImage.jsx';
import { relativeTime } from '../../lib/relativeTime.js';

export function ReportCard({ report, showBoard = false }) {
  const photo = report.media?.[0] ?? report.photos?.[0];
  const reportUrl = `/laporan/${report.id}`;

  return (
    <Card className="overflow-hidden p-0">
      {showBoard && report.board && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs">
          <Link to={`/b/${report.board.slug}`} className="font-semibold text-text hover:text-brand">
            {report.board.name}
          </Link>
          <VerificationBadge verification={report.board.verification} size="sm" />
        </div>
      )}
      <Link
        to={reportUrl}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      >
        {photo?.url && (
          <BlurredImage
            src={photo.url}
            alt={`Foto laporan: ${report.title}`}
            isBlurred={photo.isBlurred}
            frameClassName="aspect-[4/3] w-full sm:aspect-[16/10]"
          />
        )}
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <ReportSeverityBadge severity={report.severity} />
            <ReportStatusBadge status={report.status} />
            {report.isHidden && <Badge>Ditinjau moderator</Badge>}
          </div>
          <h2 className="mt-3 text-lg font-semibold">{report.title}</h2>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
            {report.category?.name && <span>{report.category.name}</span>}
            {report.locationDetail && <span>{report.locationDetail}</span>}
            <time dateTime={report.createdAt}>{relativeTime(report.createdAt)}</time>
          </div>
        </div>
      </Link>
      <div className="flex items-start gap-2 border-t border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <EngagementBar report={report} />
        </div>
        <FlagButton targetType="REPORT" targetId={report.id} label="Opsi laporan" />
      </div>
    </Card>
  );
}
