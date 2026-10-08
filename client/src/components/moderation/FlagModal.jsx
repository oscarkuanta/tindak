import { useState } from 'react';
import {
  BOARD_FLAG_REASONS,
  FLAG_REASON_META,
  REPORT_FLAG_REASONS,
  createFlagRequestSchema,
} from '@tindak/shared';
import { Alert, Button, Modal } from '../ui/index.js';
import { useCreateFlag } from '../../features/moderation/hooks.js';
import { apiErrorMessage } from '../../features/auth/formErrors.js';
import { FlagReasonIcon } from '../icons/AppIcons.jsx';

export function FlagModal({ open, onClose, targetType, targetId, onFlagged }) {
  const reasons = targetType === 'BOARD' ? BOARD_FLAG_REASONS : REPORT_FLAG_REASONS;
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const mutation = useCreateFlag();

  function close() {
    setReason('');
    setNote('');
    setError(null);
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = createFlagRequestSchema.safeParse({
      targetType,
      targetId,
      reason,
      note: note.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Pilih alasan pelanggaran');
      return;
    }
    try {
      const result = await mutation.mutateAsync(parsed.data);
      onFlagged?.(result.data);
      close();
    } catch (apiError) {
      setError(apiErrorMessage(apiError));
    }
  }

  return (
    <Modal open={open} onClose={close} title="Tandai Pelanggaran">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm text-text-muted">
            Pilih alasan. Moderator akan meninjau tanda ini.
          </legend>
          {reasons.map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-3 rounded-base border px-3 py-2 text-sm ${reason === value ? 'border-brand bg-brand-soft' : 'border-border hover:bg-surface-muted'}`}
            >
              <input
                type="radio"
                name="flag-reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="accent-brand"
              />
              <FlagReasonIcon reason={value} className="text-danger" />
              <span>{FLAG_REASON_META[value].label}</span>
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Catatan (opsional)
          <textarea
            value={note}
            maxLength={500}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            className="rounded-base border border-border bg-surface px-3 py-2 text-sm font-normal focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
          <Button type="submit" variant="danger" loading={mutation.isPending}>
            Kirim Tanda
          </Button>
        </div>
      </form>
    </Modal>
  );
}
