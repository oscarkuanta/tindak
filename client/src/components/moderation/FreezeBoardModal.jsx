import { useState } from 'react';
import { Snowflake } from '@phosphor-icons/react';
import { FREEZE_DURATION_LABELS, FREEZE_DURATIONS, freezeBoardRequestSchema } from '@tindak/shared';
import { Alert, Button, Modal } from '../ui/index.js';
import { useFreezeBoard } from '../../features/moderation/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { apiErrorMessage } from '../../features/auth/formErrors.js';
import { SELECT_CLASS, TEXTAREA_CLASS, formatDateTime } from '../../pages/admin/adminFormat.js';

export function FreezeBoardModal({ board, onClose }) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7d');
  const [error, setError] = useState(null);
  const mutation = useFreezeBoard();
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = freezeBoardRequestSchema.safeParse({ reason, duration });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    try {
      const result = await mutation.mutateAsync({ slug: board.slug, ...parsed.data });
      const until = result.data.frozenUntil
        ? ` sampai ${formatDateTime(result.data.frozenUntil)}`
        : ' permanen';
      showToast(
        result.data.verificationRevoked
          ? `Board di-freeze${until} dan status Official dicabut`
          : `Board di-freeze${until}`,
      );
      onClose();
    } catch (apiError) {
      setError(apiErrorMessage(apiError));
    }
  }

  return (
    <Modal open onClose={onClose} title={`Freeze ${board.name}?`}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-text-muted">
          Board yang di-freeze tidak bisa dibuka, dicari, atau menerima laporan baru. Setelah
          durasinya habis, Board otomatis aktif lagi.
        </p>
        {board.verification === 'OFFICIAL' && (
          <Alert tone="warning">Status Official Board ini akan ikut dicabut.</Alert>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Durasi freeze
          <select
            className={SELECT_CLASS}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          >
            {Object.keys(FREEZE_DURATIONS).map((key) => (
              <option key={key} value={key}>
                {FREEZE_DURATION_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Alasan freeze
          <textarea
            rows={3}
            maxLength={500}
            className={TEXTAREA_CLASS}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="danger" loading={mutation.isPending}>
            <Snowflake aria-hidden="true" size={16} weight="bold" />
            Freeze Board
          </Button>
        </div>
      </form>
    </Modal>
  );
}
