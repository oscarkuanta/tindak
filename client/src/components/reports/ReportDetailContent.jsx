import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { REPORT_HANDLING_ACTIONS } from '@tindak/shared';
import { useBoardHandlers } from '../../features/boards/hooks.js';
import { useReportAction } from '../../features/handling/hooks.js';
import { Alert, Badge, Card, Spinner } from '../ui/index.js';
import { HandlerActionPanel } from './HandlerActionPanel.jsx';
import { ReporterResponsePanel } from './ReporterResponsePanel.jsx';
import { ReportSeverityBadge, ReportStatusBadge } from './ReportStatusBadge.jsx';
import { ReportTimeline } from './ReportTimeline.jsx';
import { EngagementBar } from './EngagementBar.jsx';

function formatCreatedAt(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(value),
  );
}

const HANDLER_ACTIONS = [
  REPORT_HANDLING_ACTIONS.PROCESS,
  REPORT_HANDLING_ACTIONS.REQUEST_INFO,
  REPORT_HANDLING_ACTIONS.REJECT,
  REPORT_HANDLING_ACTIONS.DUPLICATE,
  REPORT_HANDLING_ACTIONS.RESOLVE,
];

export function ReportDetailContent({ report, credentials }) {
  const [searchParams] = useSearchParams();
  const allowed = useMemo(() => new Set(report.allowedActions ?? []), [report.allowedActions]);
  const canHandle = HANDLER_ACTIONS.some((action) => allowed.has(action));
  const boardSlug = report.board?.slug;
  const handlersQuery = useBoardHandlers(boardSlug, { enabled: canHandle && Boolean(boardSlug) });
  const action = useReportAction({
    reportId: report.id,
    slug: boardSlug,
    trackingCode: credentials?.trackingCode,
  });
  const media = report.media ?? [];
  const beforeMedia = media.filter((item) => item.kind === 'BEFORE');
  const afterMedia = media.filter((item) => item.kind === 'AFTER');
  const extraMedia = media.filter((item) => item.kind === 'EXTRA');

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {report.board?.status === 'INACTIVE' && (
        <Alert tone="warning">
          Board Tidak Aktif. Laporan tetap dapat dibaca, tetapi mungkin belum ditangani.
        </Alert>
      )}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {boardSlug && (
            <Link to={`/b/${boardSlug}`} className="text-sm font-medium text-brand hover:underline">
              {report.board?.name ?? 'Kembali ke Board'}
            </Link>
          )}
          <ReportStatusBadge status={report.status} />
          <ReportSeverityBadge severity={report.severity} />
          {report.isOverdue && <Badge tone="danger">⏰ Terlambat</Badge>}
          {report.reporterNotSatisfied && <Badge tone="warning">Pelapor tidak puas</Badge>}
        </div>
        <h1 className="text-2xl font-bold">{report.title}</h1>
        <p className="text-sm text-text-muted">
          {report.category?.name ?? 'Tanpa kategori'}
          {report.locationDetail ? ` · ${report.locationDetail}` : ''}
        </p>
        <p className="text-xs text-text-muted">
          Dilaporkan oleh {report.isAnonymous ? 'Anonim' : (report.reporter?.name ?? 'Anonim')}
          {report.createdAt && (
            <>
              {' · '}
              <time dateTime={report.createdAt}>{formatCreatedAt(report.createdAt)}</time>
            </>
          )}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-6">{report.description}</p>
        {!credentials && <EngagementBar report={report} />}
        {report.parent && (
          <p className="rounded-base bg-surface-muted p-3 text-sm">
            Laporan ini ditandai sebagai duplikat dari{' '}
            <Link
              to={`/laporan/${report.parent.id}`}
              className="font-semibold text-brand hover:underline"
            >
              {report.parent.title ?? `laporan #${report.parent.id}`}
            </Link>
            .
          </p>
        )}
        {report.status === 'RESOLVED' &&
          report.timeline?.some(
            (entry) =>
              entry.actorType === 'SYSTEM' &&
              entry.note?.toLocaleLowerCase('id-ID').includes('otomatis'),
          ) && <p className="text-sm font-medium text-info">Dikonfirmasi otomatis</p>}
      </Card>

      {(beforeMedia.length > 0 || afterMedia.length > 0 || extraMedia.length > 0) && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Foto laporan</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[...beforeMedia, ...afterMedia, ...extraMedia].map((item) => (
              <figure key={item.id} className="space-y-1">
                <img
                  src={item.url}
                  alt={
                    item.kind === 'AFTER'
                      ? 'Foto sesudah penindakan'
                      : item.kind === 'EXTRA'
                        ? 'Foto tambahan'
                        : 'Foto sebelum penindakan'
                  }
                  className={`aspect-[4/3] w-full rounded-base object-cover ${item.isBlurred ? 'blur-md' : ''}`}
                />
                <figcaption className="text-xs text-text-muted">
                  {item.kind === 'AFTER'
                    ? 'Sesudah'
                    : item.kind === 'EXTRA'
                      ? 'Tambahan'
                      : 'Sebelum'}
                </figcaption>
              </figure>
            ))}
          </div>
        </Card>
      )}

      {report.infoRequest && (
        <Card>
          <h2 className="text-lg font-semibold">Perlu Info</h2>
          <p className="mt-2 text-sm">{report.infoRequest.question}</p>
          {report.infoRequest.answer && (
            <p className="mt-3 rounded-base bg-surface-muted p-3 text-sm">
              <span className="font-semibold">Jawaban pelapor:</span> {report.infoRequest.answer}
            </p>
          )}
        </Card>
      )}

      {canHandle &&
        (handlersQuery.isError ? (
          <Alert tone="danger">
            Daftar Penindak belum dapat dimuat: {handlersQuery.error.message}
          </Alert>
        ) : (
          <HandlerActionPanel
            report={report}
            handlers={handlersQuery.data?.data ?? []}
            onAction={action.runAction}
            isPending={action.isPending}
            initialAction={searchParams.get('action')}
          />
        ))}

      <ReporterResponsePanel
        report={report}
        credentials={credentials}
        onAction={action.runAction}
        isPending={action.isPending}
      />

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Riwayat Laporan</h2>
        <ReportTimeline entries={report.timeline ?? []} />
        {report.reopenCount >= 2 && report.reporterNotSatisfied && (
          <p className="mt-4 text-sm font-medium text-warning">Batas buka ulang sudah tercapai.</p>
        )}
      </Card>
    </div>
  );
}

export function ReportLoadingState({ label = 'Memuat laporan' }) {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
