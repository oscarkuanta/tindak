import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  REPORT_HANDLING_ACTIONS,
  REPORT_HANDLING_KANBAN_COLUMNS,
  REPORT_HANDLING_STATUS_LABELS,
  REPORT_HANDLING_STATUSES,
  reportQueueFiltersSchema,
} from '@tindak/shared';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui/index.js';
import { ReportStatusBadge } from '../../components/reports/ReportStatusBadge.jsx';
import { useBoard, useBoardHandlers } from '../../features/boards/hooks.js';
import { useQueueReportAction, useReportQueue } from '../../features/handling/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { useBoardChannel } from '../../features/realtime/socketContext.js';

const TARGET_ACTIONS = {
  NEED_INFO: { action: REPORT_HANDLING_ACTIONS.REQUEST_INFO, path: 'request-info' },
  IN_PROGRESS: { action: REPORT_HANDLING_ACTIONS.PROCESS },
  AWAITING_CONFIRMATION: { action: REPORT_HANDLING_ACTIONS.RESOLVE, path: 'resolve' },
};

const SEVERITY_LABELS = { LOW: 'Rendah', MEDIUM: 'Sedang', DANGEROUS: 'Berbahaya' };

function columnForStatus(status) {
  return REPORT_HANDLING_KANBAN_COLUMNS.find((column) => column.statuses.includes(status));
}

function ReportQueueCard({ report, onDragStart }) {
  return (
    <Card
      draggable
      onDragStart={(event) => onDragStart(event, report)}
      className="cursor-grab space-y-2 active:cursor-grabbing"
      data-report-id={report.id}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ReportStatusBadge status={report.status} />
        <Badge tone={report.severity === 'DANGEROUS' ? 'danger' : 'neutral'}>
          {SEVERITY_LABELS[report.severity] ?? report.severity}
        </Badge>
        {report.isOverdue && <Badge tone="danger">⏰ Terlambat</Badge>}
      </div>
      <Link
        to={`/laporan/${report.id}`}
        className="block font-semibold hover:text-brand hover:underline"
      >
        {report.title}
      </Link>
      <p className="line-clamp-2 text-sm text-text-muted">
        {report.locationDetail || 'Lokasi belum diisi'}
      </p>
      <p className="text-xs text-text-muted">
        {report.category?.name ?? 'Tanpa kategori'}
        {report.assignee?.name ? ` · ${report.assignee.name}` : ''}
      </p>
    </Card>
  );
}

export function BoardQueuePage() {
  const { slug } = useParams();
  useBoardChannel(slug);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState('kanban');
  const { showToast } = useToast();
  const filterResult = useMemo(
    () => reportQueueFiltersSchema.safeParse(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  const filters = filterResult.success ? filterResult.data : {};
  const boardQuery = useBoard(slug);
  const queueQuery = useReportQueue(slug, filters, filterResult.success);
  const handlersQuery = useBoardHandlers(slug);
  const processMutation = useQueueReportAction(slug);
  const reports = queueQuery.data?.data ?? [];
  const meta = queueQuery.data?.meta;
  const board = boardQuery.data?.data;
  const statusOptions = Object.entries(REPORT_HANDLING_STATUSES).map(([key, value]) => ({
    value,
    label: REPORT_HANDLING_STATUS_LABELS[key],
  }));
  const archivedReports = reports.filter((report) =>
    ['REJECTED', 'DUPLICATE'].includes(report.status),
  );

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  }

  function startDrag(event, report) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'application/x-tindak-report',
      JSON.stringify({ reportId: report.id, status: report.status }),
    );
  }

  async function dropOnColumn(event, column) {
    event.preventDefault();
    let dragged;
    try {
      dragged = JSON.parse(event.dataTransfer.getData('application/x-tindak-report'));
    } catch {
      return;
    }
    const report = reports.find((item) => String(item.id) === String(dragged.reportId));
    const currentColumn = columnForStatus(report?.status);
    if (
      !report ||
      (currentColumn?.id === column.id &&
        !(report.status === 'REOPENED' && column.id === 'IN_PROGRESS'))
    ) {
      return;
    }
    const target = TARGET_ACTIONS[column.id];
    if (!target || !(report.allowedActions ?? []).includes(target.action)) {
      showToast('Perubahan status ini belum tersedia untuk laporan.', 'danger');
      return;
    }
    if (target.path) {
      navigate(`/laporan/${report.id}?action=${target.path}`);
      return;
    }
    try {
      await processMutation.mutateAsync({
        reportId: report.id,
        action: REPORT_HANDLING_ACTIONS.PROCESS,
        payload: {},
      });
      showToast('Laporan dipindahkan ke Diproses.');
    } catch (error) {
      showToast(error.message || 'Status laporan belum dapat diubah.', 'danger');
    }
  }

  if (boardQuery.isPending)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner label="Memuat Board" />
      </div>
    );
  if (boardQuery.isError) {
    return <Alert>{boardQuery.error.message}</Alert>;
  }
  if (!filterResult.success) {
    return <Alert>{filterResult.error.issues[0]?.message ?? 'Filter antrean tidak valid.'}</Alert>;
  }
  if (queueQuery.isPending)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner label="Memuat antrean laporan" />
      </div>
    );
  if (queueQuery.isError) {
    return <Alert>{queueQuery.error.message}</Alert>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to={`/b/${slug}`} className="text-sm text-brand hover:underline">
            {board?.name ?? 'Kembali ke Board'}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Antrean Laporan</h1>
        </div>
        <div className="flex gap-2" aria-label="Tampilan antrean">
          <Button
            variant={view === 'kanban' ? 'primary' : 'secondary'}
            onClick={() => setView('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={view === 'list' ? 'primary' : 'secondary'}
            onClick={() => setView('list')}
          >
            Daftar
          </Button>
        </div>
      </div>
      {board?.status === 'INACTIVE' && (
        <Alert tone="info">
          Board Tidak Aktif. Aktivitas Penindak akan mengaktifkan Board kembali.
        </Alert>
      )}

      <Card className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Filter antrean">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Status</span>
          <select
            value={searchParams.get('status') ?? ''}
            onChange={(event) => updateFilter('status', event.target.value)}
            className="h-10 w-full rounded-base border border-border bg-surface px-3"
          >
            <option value="">Semua status</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Kategori</span>
          <select
            value={searchParams.get('categoryId') ?? ''}
            onChange={(event) => updateFilter('categoryId', event.target.value)}
            className="h-10 w-full rounded-base border border-border bg-surface px-3"
          >
            <option value="">Semua kategori</option>
            {(board?.categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Tingkat bahaya</span>
          <select
            value={searchParams.get('severity') ?? ''}
            onChange={(event) => updateFilter('severity', event.target.value)}
            className="h-10 w-full rounded-base border border-border bg-surface px-3"
          >
            <option value="">Semua tingkat</option>
            {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Penanggung jawab</span>
          <select
            value={searchParams.get('assigneeId') ?? ''}
            onChange={(event) => updateFilter('assigneeId', event.target.value)}
            className="h-10 w-full rounded-base border border-border bg-surface px-3"
          >
            <option value="">Semua Penindak</option>
            {(handlersQuery.data?.data ?? [])
              .filter((handler) => handler.status === 'ACTIVE')
              .map((handler) => (
                <option key={handler.userId} value={handler.userId}>
                  {handler.user?.name ?? handler.user?.email}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Batas waktu</span>
          <select
            value={searchParams.get('overdue') ?? ''}
            onChange={(event) => updateFilter('overdue', event.target.value)}
            className="h-10 w-full rounded-base border border-border bg-surface px-3"
          >
            <option value="">Semua laporan</option>
            <option value="true">Terlambat</option>
            <option value="false">Belum terlambat</option>
          </select>
        </label>
      </Card>

      {processMutation.isError && <Alert>{processMutation.error.message}</Alert>}
      {reports.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-muted">
          Tidak ada laporan dalam antrean ini.
        </Card>
      ) : view === 'kanban' ? (
        <>
          <div className="grid gap-4 xl:grid-cols-5">
            {REPORT_HANDLING_KANBAN_COLUMNS.map((column) => {
              const items = reports.filter((report) => column.statuses.includes(report.status));
              return (
                <section
                  key={column.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => dropOnColumn(event, column)}
                  className="min-h-56 rounded-card border border-border bg-surface-muted p-3"
                  aria-label={`Kolom ${column.label}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold">{column.label}</h2>
                    <Badge>{items.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {items.map((report) => (
                      <ReportQueueCard key={report.id} report={report} onDragStart={startDrag} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          {archivedReports.length > 0 && (
            <section className="space-y-3" aria-label="Laporan ditolak atau duplikat">
              <h2 className="text-lg font-semibold">Ditolak dan Duplikat</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {archivedReports.map((report) => (
                  <ReportQueueCard key={report.id} report={report} onDragStart={startDrag} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportQueueCard key={report.id} report={report} onDragStart={startDrag} />
          ))}
        </div>
      )}

      {(meta?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Halaman {meta.page} dari {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={meta.page <= 1}
              onClick={() => updateFilter('page', String(meta.page - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="secondary"
              disabled={meta.page >= meta.totalPages}
              onClick={() => updateFilter('page', String(meta.page + 1))}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
