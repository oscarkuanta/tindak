import { useState } from 'react';
import {
  REPORT_HANDLING_ACTIONS,
  answerReportInfoSchema,
  confirmReportSchema,
} from '@tindak/shared';
import { BeforeAfterSlider } from './BeforeAfterSlider.jsx';
import { Alert, Button, Input, Modal } from '../ui/index.js';
import { compressImages } from '../../lib/compressImage.js';

function guestFields(credentials) {
  return credentials?.trackingCode && credentials?.secret
    ? { trackingCode: credentials.trackingCode, secret: credentials.secret }
    : {};
}

function validateExtraPhotos(files) {
  if (files.length > 4) return 'Maksimal 4 foto tambahan.';
  if (
    files.some(
      (file) =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024,
    )
  ) {
    return 'Foto tidak bisa diproses. Coba foto lain dalam format JPG, PNG, atau WebP.';
  }
  return null;
}

export function ReporterResponsePanel({ report, credentials, onAction, isPending = false }) {
  const [answer, setAnswer] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const allowedActions = new Set(report.allowedActions ?? []);
  const before = report.media?.find((item) => item.kind === 'BEFORE');
  const after = report.media?.find((item) => item.kind === 'AFTER');

  if (
    !allowedActions.has(REPORT_HANDLING_ACTIONS.ANSWER_INFO) &&
    !allowedActions.has(REPORT_HANDLING_ACTIONS.CONFIRM)
  ) {
    return null;
  }

  async function submit(action, payload) {
    setActionError('');
    try {
      await onAction(action, payload);
      setConfirmOpen(false);
      setAnswer('');
      setNote('');
      setFiles([]);
    } catch (error) {
      setActionError(error.message || 'Jawaban belum dapat disimpan. Coba lagi.');
    }
  }

  function submitAnswer(event) {
    event.preventDefault();
    const result = answerReportInfoSchema.safeParse({ answer, ...guestFields(credentials) });
    if (!result.success) return setFormError(result.error.issues[0]?.message ?? 'Periksa jawaban.');
    setFormError('');
    submit(REPORT_HANDLING_ACTIONS.ANSWER_INFO, result.data);
  }

  function confirmResolved() {
    const result = confirmReportSchema.safeParse({
      result: 'resolved',
      ...guestFields(credentials),
    });
    if (!result.success)
      return setActionError(result.error.issues[0]?.message ?? 'Periksa tautan lacak.');
    submit(REPORT_HANDLING_ACTIONS.CONFIRM, result.data);
  }

  function submitNotResolved(event) {
    event.preventDefault();
    const result = confirmReportSchema.safeParse({
      result: 'not_resolved',
      note,
      ...guestFields(credentials),
    });
    if (!result.success)
      return setFormError(result.error.issues[0]?.message ?? 'Catatan wajib diisi.');
    const photoError = validateExtraPhotos(files);
    if (photoError) return setFormError(photoError);
    setFormError('');
    if (files.length === 0) {
      return submit(REPORT_HANDLING_ACTIONS.CONFIRM, result.data);
    }
    const body = new FormData();
    Object.entries(result.data).forEach(([key, value]) => body.set(key, value));
    files.forEach((file) => body.append('photos', file));
    submit(REPORT_HANDLING_ACTIONS.CONFIRM, body);
  }

  return (
    <section
      className="rounded-card border border-border bg-surface p-4 sm:p-5"
      aria-labelledby="reporter-response-title"
    >
      <h2 id="reporter-response-title" className="text-lg font-semibold">
        Tanggapan Pelapor
      </h2>
      {allowedActions.has(REPORT_HANDLING_ACTIONS.ANSWER_INFO) && report.infoRequest && (
        <form className="mt-4 space-y-3" onSubmit={submitAnswer}>
          <div className="rounded-base bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Pertanyaan Penindak
            </p>
            <p className="mt-1 text-sm">{report.infoRequest.question}</p>
          </div>
          <label htmlFor="answer-info" className="block text-sm font-medium">
            Jawaban kamu
          </label>
          <textarea
            id="answer-info"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={4}
            maxLength={2000}
            required
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
          <Button type="submit" loading={isPending}>
            Kirim jawaban
          </Button>
        </form>
      )}

      {allowedActions.has(REPORT_HANDLING_ACTIONS.CONFIRM) && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-text-muted">
            Penindak sudah mengunggah bukti penyelesaian. Apakah masalah ini sudah beres?
          </p>
          <BeforeAfterSlider before={before} after={after} />
          {actionError && <Alert tone="danger">{actionError}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={confirmResolved} loading={isPending}>
              Sudah Beres
            </Button>
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
              Belum Beres
            </Button>
          </div>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Apa yang belum beres?">
        <form className="space-y-4" onSubmit={submitNotResolved}>
          <label htmlFor="reopen-note" className="block text-sm font-medium">
            Jelaskan masalah yang masih ada
          </label>
          <textarea
            id="reopen-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            maxLength={2000}
            required
            className="w-full rounded-base border border-border bg-surface px-3 py-2 text-sm"
          />
          <Input
            type="file"
            label="Foto tambahan (opsional, maksimal 4)"
            accept="image/*"
            multiple
            onChange={async (event) => {
              const selectedFiles = Array.from(event.target.files ?? []);
              if (selectedFiles.length > 4) {
                setFiles([]);
                setFormError('Maksimal 4 foto tambahan.');
                return;
              }
              const { files: ready, errors } = await compressImages(selectedFiles);
              setFiles(ready);
              setFormError(errors.join(' '));
            }}
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
          <Button type="submit" variant="danger" loading={isPending}>
            Kirim dan buka ulang
          </Button>
        </form>
      </Modal>
    </section>
  );
}
