import { useState } from 'react';
import { Link } from 'react-router';
import {
  BAN_TARGET_LABELS,
  FLAG_REASON_META,
  FLAG_REASON_ORDER,
  removeReportRequestSchema,
} from '@tindak/shared';
import { Alert, Badge, Button, Card, Modal } from '../../components/ui/index.js';
import { VerificationBadge } from '../../components/boards/BoardBadges.jsx';
import { BanFields } from '../../components/moderation/BanFields.jsx';
import { FreezeBoardModal } from '../../components/moderation/FreezeBoardModal.jsx';
import {
  useDismissBoardFlags,
  useModerationQueue,
  useRemoveReport,
  useRestoreReport,
} from '../../features/moderation/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { apiErrorMessage } from '../../features/auth/formErrors.js';
import { Pager, QueryState } from './adminShared.jsx';
import { SELECT_CLASS, TEXTAREA_CLASS, formatDateTime } from './adminFormat.js';

function ReasonBadge({ reason }) {
  const meta = FLAG_REASON_META[reason];
  return (
    <Badge tone={meta?.severe ? 'danger' : 'warning'}>
      <span aria-hidden="true">{meta?.emoji}</span> {meta?.label ?? reason}
    </Badge>
  );
}

function banTargetsFor(report) {
  return [
    report.reporterType === 'ACCOUNT' && 'USER',
    report.guestTokenMasked && 'GUEST_TOKEN',
    report.ipHashMasked && 'IP',
  ].filter(Boolean);
}

function RemoveReportModal({ item, withBan, onClose }) {
  const report = item.report;
  const targets = banTargetsFor(report);
  const [note, setNote] = useState('');
  const [ban, setBan] = useState({ targetType: targets[0], duration: '7d', reason: '' });
  const [error, setError] = useState(null);
  const mutation = useRemoveReport();
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = removeReportRequestSchema.safeParse({
      note: note.trim() || undefined,
      ban: withBan ? ban : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    try {
      await mutation.mutateAsync({ id: report.id, ...parsed.data });
      showToast(withBan ? 'Laporan dihapus dan ban dibuat' : 'Laporan dihapus');
      onClose();
    } catch (apiError) {
      setError(apiErrorMessage(apiError));
    }
  }

  return (
    <Modal open onClose={onClose} title={withBan ? 'Hapus laporan + Ban' : 'Hapus laporan'}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-text-muted">
          Laporan &quot;{report.title}&quot; tidak akan tampil lagi untuk siapa pun kecuali Admin.
        </p>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Catatan moderator (opsional)
          <textarea
            rows={2}
            maxLength={500}
            className={TEXTAREA_CLASS}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {withBan &&
          (targets.length ? (
            <BanFields value={ban} onChange={setBan} targets={targets} />
          ) : (
            <Alert>Laporan ini tidak punya data pelapor untuk di-ban.</Alert>
          ))}
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={mutation.isPending}
            disabled={withBan && !targets.length}
          >
            Hapus
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FlagList({ flags }) {
  return (
    <ul className="space-y-1 text-sm">
      {flags.map((flag) => (
        <li key={flag.id} className="flex flex-wrap items-center gap-2">
          <ReasonBadge reason={flag.reason} />
          <span className="text-text-muted">
            {flag.flagger?.name ?? 'Sistem'} · {formatDateTime(flag.createdAt)}
            {flag.weight === 0 && flag.flagger ? ' · bobot 0' : ''}
          </span>
          {flag.note && (
            <span className="w-full pl-1 text-text-muted">&quot;{flag.note}&quot;</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ReportItem({ item }) {
  const report = item.report;
  const [modal, setModal] = useState(null);
  const restore = useRestoreReport();
  const { showToast } = useToast();
  const photo = report.media?.[0];

  async function handleRestore() {
    try {
      await restore.mutateAsync({ id: report.id });
      showToast('Laporan dipulihkan');
    } catch (error) {
      showToast(apiErrorMessage(error), 'danger');
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <Badge tone="info">Laporan</Badge>
        <Link to={`/b/${report.board.slug}`} className="font-semibold hover:text-brand">
          {report.board.name}
        </Link>
        <span>{item.flagCount} tanda</span>
        {report.isHidden && <Badge>Disembunyikan</Badge>}
        {report.hiddenByHandler && <Badge tone="warning">Disembunyikan Penindak</Badge>}
      </div>
      <div className="flex gap-3">
        {photo?.url && (
          <div className="relative shrink-0">
            <img
              src={photo.url}
              alt="Pratinjau foto laporan"
              className="size-24 rounded-base object-cover"
            />
            {typeof photo.nsfwScore === 'number' && (
              <span className="absolute bottom-1 left-1 rounded bg-text/75 px-1 text-[11px] text-surface">
                NSFW {Math.round(photo.nsfwScore * 100)}%
              </span>
            )}
          </div>
        )}
        <div className="min-w-0">
          <Link to={`/laporan/${report.id}`} className="font-semibold hover:text-brand">
            {report.title}
          </Link>
          <p className="mt-1 line-clamp-3 text-sm text-text-muted">{report.description}</p>
        </div>
      </div>
      <FlagList flags={item.flags} />
      <dl className="grid gap-1 rounded-base bg-surface-muted p-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="inline text-text-muted">Pelapor: </dt>
          <dd className="inline">
            {report.reporterType === 'ACCOUNT'
              ? `${report.reporter?.name} (${report.reporter?.email})`
              : 'Tamu'}
          </dd>
        </div>
        <div>
          <dt className="inline text-text-muted">IP: </dt>
          <dd className="inline font-mono">{report.ipHashMasked ?? '-'}</dd>
        </div>
        <div>
          <dt className="inline text-text-muted">Riwayat: </dt>
          <dd className="inline">
            {report.history.totalReports} laporan, {report.history.removedReports} dihapus,{' '}
            {report.history.hiddenReports} disembunyikan
          </dd>
        </div>
        <div>
          <dt className="inline text-text-muted">Ban: </dt>
          <dd className="inline">
            {report.history.bans.length
              ? report.history.bans
                  .map(
                    (ban) =>
                      `${BAN_TARGET_LABELS[ban.targetType]}${ban.isActive ? ' (aktif)' : ''}`,
                  )
                  .join(', ')
              : 'Belum pernah'}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" loading={restore.isPending} onClick={handleRestore}>
          Pulihkan
        </Button>
        <Button variant="danger" size="sm" onClick={() => setModal('remove')}>
          Hapus
        </Button>
        <Button variant="danger" size="sm" onClick={() => setModal('ban')}>
          Hapus + Ban
        </Button>
      </div>
      {modal && (
        <RemoveReportModal item={item} withBan={modal === 'ban'} onClose={() => setModal(null)} />
      )}
    </Card>
  );
}

function BoardItem({ item }) {
  const board = item.board;
  const [freezing, setFreezing] = useState(false);
  const dismiss = useDismissBoardFlags();
  const { showToast } = useToast();

  async function handleDismiss() {
    try {
      await dismiss.mutateAsync({ slug: board.slug });
      showToast('Tanda Board diabaikan');
    } catch (error) {
      showToast(apiErrorMessage(error), 'danger');
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <Badge tone="brand">Board</Badge>
        <span>{item.flagCount} tanda</span>
        {board.status === 'FROZEN' && <Badge tone="danger">Dibekukan</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/b/${board.slug}`} className="font-semibold hover:text-brand">
          {board.name}
        </Link>
        <VerificationBadge verification={board.verification} size="sm" />
        <span className="text-sm text-text-muted">{board.city}</span>
      </div>
      <p className="text-xs text-text-muted">
        Pemilik: {board.owner?.name} ({board.owner?.email})
      </p>
      <FlagList flags={item.flags} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" loading={dismiss.isPending} onClick={handleDismiss}>
          Abaikan
        </Button>
        {board.status !== 'FROZEN' && (
          <Button variant="danger" size="sm" onClick={() => setFreezing(true)}>
            Bekukan Board
          </Button>
        )}
      </div>
      {freezing && <FreezeBoardModal board={board} onClose={() => setFreezing(false)} />}
    </Card>
  );
}

export function ModerationQueuePage() {
  const [filters, setFilters] = useState({ reason: '', targetType: '', page: 1 });
  const query = useModerationQueue(filters);
  const update = (patch) => setFilters((value) => ({ ...value, page: 1, ...patch }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter alasan"
          className={SELECT_CLASS}
          value={filters.reason}
          onChange={(event) => update({ reason: event.target.value })}
        >
          <option value="">Semua alasan</option>
          {FLAG_REASON_ORDER.map((reason) => (
            <option key={reason} value={reason}>
              {FLAG_REASON_META[reason].emoji} {FLAG_REASON_META[reason].label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter target"
          className={SELECT_CLASS}
          value={filters.targetType}
          onChange={(event) => update({ targetType: event.target.value })}
        >
          <option value="">Laporan dan Board</option>
          <option value="REPORT">Laporan</option>
          <option value="BOARD">Board</option>
        </select>
      </div>
      <QueryState query={query} empty="Tidak ada konten yang menunggu tinjauan.">
        {(items, meta) => (
          <>
            <div className="flex flex-col gap-3">
              {items.map((item) =>
                item.targetType === 'REPORT' && item.report ? (
                  <ReportItem key={`R${item.targetId}`} item={item} />
                ) : item.board ? (
                  <BoardItem key={`B${item.targetId}`} item={item} />
                ) : null,
              )}
            </div>
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
