import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  REPORT_HANDLING_ACTIONS,
  REPORT_REJECTION_REASON_LABELS,
  REPORT_REJECTION_REASONS,
  duplicateReportSchema,
  processReportSchema,
  rejectReportSchema,
  requestReportInfoSchema,
  resolveReportSchema,
} from '@tindak/shared';
import { searchBoardReports } from '../../features/handling/api.js';
import { Alert, Button, Input, Modal } from '../ui/index.js';

const HANDLER_ACTIONS = [
  REPORT_HANDLING_ACTIONS.PROCESS,
  REPORT_HANDLING_ACTIONS.REQUEST_INFO,
  REPORT_HANDLING_ACTIONS.REJECT,
  REPORT_HANDLING_ACTIONS.DUPLICATE,
  REPORT_HANDLING_ACTIONS.RESOLVE,
];

const ACTION_LABELS = {
  requestInfo: 'Minta Info',
  reject: 'Tolak laporan',
  duplicate: 'Tandai Duplikat',
  resolve: 'Tandai Selesai',
};

function validatePhotos(files) {
  if (files.length < 1 || files.length > 4) return 'Unggah 1 sampai 4 foto sesudah.';
  if (
    files.some(
      (file) =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024,
    )
  ) {
    return 'Foto harus JPEG, PNG, atau WebP dan berukuran maksimal 5 MB.';
  }
  return null;
}

export function HandlerActionPanel({
  report,
  handlers = [],
  onAction,
  isPending = false,
  initialAction,
}) {
  const [modal, setModal] = useState(null);
  const [question, setQuestion] = useState('');
  const [reason, setReason] = useState(REPORT_REJECTION_REASONS.NOT_PHYSICAL);
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [parentId, setParentId] = useState('');
  const [assigneeId, setAssigneeId] = useState(
    report.assignee?.id || report.assigneeId
      ? String(report.assignee?.id ?? report.assigneeId)
      : '',
  );
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const allowedActions = useMemo(
    () => new Set(report.allowedActions ?? []),
    [report.allowedActions],
  );
  const assigneeOptions = useMemo(() => {
    const owner = report.board?.owner;
    const active = handlers
      .filter((handler) => handler.status === 'ACTIVE' && handler.userId !== owner?.id)
      .map((handler) => ({
        id: handler.userId,
        label: handler.user?.name ?? handler.user?.email ?? `Penindak ${handler.userId}`,
      }));
    return owner ? [{ id: owner.id, label: `${owner.name} (Penindak Utama)` }, ...active] : active;
  }, [handlers, report.board?.owner]);
  const duplicateQuery = useQuery({
    queryKey: ['boards', report.board?.slug, 'duplicate-candidates', search.trim()],
    queryFn: () => searchBoardReports(report.board.slug, search.trim()),
    enabled: modal === 'duplicate' && Boolean(report.board?.slug) && search.trim().length >= 2,
  });

  useEffect(() => {
    const actionByKey = {
      'request-info': ['requestInfo', REPORT_HANDLING_ACTIONS.REQUEST_INFO],
      reject: ['reject', REPORT_HANDLING_ACTIONS.REJECT],
      duplicate: ['duplicate', REPORT_HANDLING_ACTIONS.DUPLICATE],
      resolve: ['resolve', REPORT_HANDLING_ACTIONS.RESOLVE],
    };
    const next = actionByKey[initialAction];
    if (next && allowedActions.has(next[1])) openAction(next[0]);
  }, [initialAction, allowedActions]);

  const candidates = (duplicateQuery.data?.data ?? []).filter((candidate) => {
    const isNotSelf = String(candidate.id) !== String(report.id);
    const canBeParent = !['REJECTED', 'DUPLICATE', 'RESOLVED'].includes(candidate.status);
    const matchesSearch = candidate.title
      ?.toLocaleLowerCase('id-ID')
      .includes(search.toLocaleLowerCase('id-ID'));
    return isNotSelf && canBeParent && matchesSearch;
  });

  function openAction(action) {
    setFormError('');
    setActionError('');
    setModal(action);
  }

  function closeModal() {
    setModal(null);
    setFormError('');
    setFiles([]);
  }

  async function submit(action, payload) {
    setActionError('');
    try {
      await onAction(action, payload);
      closeModal();
    } catch (error) {
      setActionError(error.message || 'Aksi belum dapat disimpan. Coba lagi.');
    }
  }

  function submitRequestInfo(event) {
    event.preventDefault();
    const result = requestReportInfoSchema.safeParse({ question });
    if (!result.success)
      return setFormError(result.error.issues[0]?.message ?? 'Periksa pertanyaan.');
    submit(REPORT_HANDLING_ACTIONS.REQUEST_INFO, result.data);
  }

  function submitReject(event) {
    event.preventDefault();
    const result = rejectReportSchema.safeParse({ reason, note });
    if (!result.success) return setFormError(result.error.issues[0]?.message ?? 'Periksa catatan.');
    submit(REPORT_HANDLING_ACTIONS.REJECT, result.data);
  }

  function submitDuplicate(event) {
    event.preventDefault();
    const result = duplicateReportSchema.safeParse({ parentId });
    if (!result.success)
      return setFormError(result.error.issues[0]?.message ?? 'Pilih laporan induk.');
    submit(REPORT_HANDLING_ACTIONS.DUPLICATE, result.data);
  }

  function submitResolve(event) {
    event.preventDefault();
    const result = resolveReportSchema.safeParse({ note });
    if (!result.success)
      return setFormError(result.error.issues[0]?.message ?? 'Catatan wajib diisi.');
    const photoError = validatePhotos(files);
    if (photoError) return setFormError(photoError);
    const body = new FormData();
    body.set('note', result.data.note);
    files.forEach((file) => body.append('photos', file));
    submit(REPORT_HANDLING_ACTIONS.RESOLVE, body);
  }

  function handleFileChange(event) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length > 4) {
      setFiles([]);
      setFormError('Maksimal 4 foto sesudah.');
      return;
    }
    setFiles(selectedFiles);
    setFormError('');
  }

  async function processReport() {
    const payload = assigneeId ? { assigneeId: Number(assigneeId) } : {};
    const result = processReportSchema.safeParse(payload);
    if (!result.success) {
      setActionError(result.error.issues[0]?.message ?? 'Penanggung jawab tidak valid.');
      return;
    }
    await submit(REPORT_HANDLING_ACTIONS.PROCESS, result.data);
  }

  const hasHandlerAction = HANDLER_ACTIONS.some((action) => allowedActions.has(action));
  if (!hasHandlerAction) return null;

  return (
    <section
      className="rounded-card border border-border bg-surface p-4 sm:p-5"
      aria-labelledby="handler-actions-title"
    >
      <h2 id="handler-actions-title" className="text-lg font-semibold">
        Aksi Penindak
      </h2>
      {assigneeOptions.length > 0 && (
        <div className="mt-4 max-w-sm">
          <label htmlFor="report-assignee" className="mb-1 block text-sm font-medium">
            Penanggung jawab
          </label>
          <select
            id="report-assignee"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            className="h-10 w-full rounded-base border border-border bg-surface px-3 text-sm"
          >
            <option value="">Belum ditentukan</option>
            {assigneeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {allowedActions.has(REPORT_HANDLING_ACTIONS.PROCESS) && (
          <Button onClick={processReport} loading={isPending}>
            Proses laporan
          </Button>
        )}
        {allowedActions.has(REPORT_HANDLING_ACTIONS.REQUEST_INFO) && (
          <Button variant="secondary" onClick={() => openAction('requestInfo')}>
            Minta Info
          </Button>
        )}
        {allowedActions.has(REPORT_HANDLING_ACTIONS.DUPLICATE) && (
          <Button variant="secondary" onClick={() => openAction('duplicate')}>
            Tandai Duplikat
          </Button>
        )}
        {allowedActions.has(REPORT_HANDLING_ACTIONS.REJECT) && (
          <Button variant="danger" onClick={() => openAction('reject')}>
            Tolak laporan
          </Button>
        )}
        {allowedActions.has(REPORT_HANDLING_ACTIONS.RESOLVE) && (
          <Button onClick={() => openAction('resolve')}>Tandai Selesai</Button>
        )}
      </div>
      {actionError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {actionError}
        </p>
      )}

      <Modal
        open={modal !== null}
        onClose={closeModal}
        title={ACTION_LABELS[modal] ?? 'Tindakan laporan'}
      >
        {modal === 'requestInfo' && (
          <form className="space-y-4" onSubmit={submitRequestInfo}>
            <label className="block text-sm font-medium" htmlFor="request-info-question">
              Pertanyaan untuk pelapor
            </label>
            <textarea
              id="request-info-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full rounded-base border border-border bg-surface px-3 py-2 text-sm"
              required
            />
            {formError && (
              <p role="alert" className="text-sm text-danger">
                {formError}
              </p>
            )}
            {actionError && (
              <p role="alert" className="text-sm text-danger">
                {actionError}
              </p>
            )}
            <Button type="submit" loading={isPending}>
              Kirim pertanyaan
            </Button>
          </form>
        )}
        {modal === 'reject' && (
          <form className="space-y-4" onSubmit={submitReject}>
            <label className="block text-sm font-medium" htmlFor="reject-reason">
              Alasan penolakan
            </label>
            <select
              id="reject-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-10 w-full rounded-base border border-border bg-surface px-3 text-sm"
            >
              {Object.entries(REPORT_REJECTION_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium" htmlFor="reject-note">
              Catatan{' '}
              {reason === REPORT_REJECTION_REASONS.OTHER
                ? '(wajib untuk alasan Lainnya)'
                : '(opsional)'}
            </label>
            <textarea
              id="reject-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={2000}
              required={reason === REPORT_REJECTION_REASONS.OTHER}
              onInvalid={(event) => {
                if (reason === REPORT_REJECTION_REASONS.OTHER && !note.trim()) {
                  event.preventDefault();
                  setFormError('Catatan wajib diisi untuk alasan Lainnya');
                }
              }}
              className="w-full rounded-base border border-border bg-surface px-3 py-2 text-sm"
            />
            {formError && (
              <p role="alert" className="text-sm text-danger">
                {formError}
              </p>
            )}
            {actionError && (
              <p role="alert" className="text-sm text-danger">
                {actionError}
              </p>
            )}
            <Button type="submit" variant="danger" loading={isPending}>
              Tolak laporan
            </Button>
          </form>
        )}
        {modal === 'duplicate' && (
          <form className="space-y-4" onSubmit={submitDuplicate}>
            <Input
              label="Cari laporan induk di Board ini"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setParentId('');
              }}
              placeholder="Ketik judul laporan"
            />
            {search.trim().length < 2 && (
              <p className="text-sm text-text-muted">Ketik minimal 2 karakter untuk mencari.</p>
            )}
            {duplicateQuery.isPending && (
              <p className="text-sm text-text-muted">Memuat laporan Board...</p>
            )}
            {duplicateQuery.isError && <Alert>{duplicateQuery.error.message}</Alert>}
            {search.trim().length >= 2 && (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => setParentId(String(candidate.id))}
                      className={`w-full rounded-base border p-3 text-left text-sm ${String(candidate.id) === parentId ? 'border-brand bg-brand/5' : 'border-border hover:bg-surface-muted'}`}
                    >
                      <span className="block font-medium">{candidate.title}</span>
                      <span className="mt-1 block text-xs text-text-muted">
                        #{candidate.id} · {candidate.status}
                      </span>
                    </button>
                  </li>
                ))}
                {!duplicateQuery.isPending && candidates.length === 0 && (
                  <li className="text-sm text-text-muted">Tidak ada laporan aktif yang cocok.</li>
                )}
              </ul>
            )}
            {formError && (
              <p role="alert" className="text-sm text-danger">
                {formError}
              </p>
            )}
            {actionError && (
              <p role="alert" className="text-sm text-danger">
                {actionError}
              </p>
            )}
            <Button type="submit" disabled={!parentId} loading={isPending}>
              Tandai Duplikat
            </Button>
          </form>
        )}
        {modal === 'resolve' && (
          <form className="space-y-4" onSubmit={submitResolve}>
            <label className="block text-sm font-medium" htmlFor="resolve-note">
              Catatan penyelesaian
            </label>
            <textarea
              id="resolve-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={2000}
              required
              className="w-full rounded-base border border-border bg-surface px-3 py-2 text-sm"
            />
            <Input
              type="file"
              label="Foto sesudah (wajib, maksimal 4 foto)"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
            />
            {files.length > 0 && (
              <p className="text-xs text-text-muted">
                {files.length} foto dipilih: {files.map((file) => file.name).join(', ')}
              </p>
            )}
            {formError && (
              <p role="alert" className="text-sm text-danger">
                {formError}
              </p>
            )}
            {actionError && (
              <p role="alert" className="text-sm text-danger">
                {actionError}
              </p>
            )}
            <Button type="submit" loading={isPending}>
              Kirim bukti dan tandai selesai
            </Button>
          </form>
        )}
      </Modal>
    </section>
  );
}
