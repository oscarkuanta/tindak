import { useState } from 'react';
import { freezeBoardRequestSchema } from '@tindak/shared';
import { Alert, Button, Modal } from '../ui/index.js';
import { useFreezeBoard } from '../../features/moderation/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { apiErrorMessage } from '../../features/auth/formErrors.js';
import { TEXTAREA_CLASS } from '../../pages/admin/adminFormat.js';

export function FreezeBoardModal({ board, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const mutation = useFreezeBoard();
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = freezeBoardRequestSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    try {
      const result = await mutation.mutateAsync({ slug: board.slug, ...parsed.data });
      showToast(
        result.data.verificationRevoked
          ? 'Board dibekukan dan status Official dicabut'
          : 'Board dibekukan',
      );
      onClose();
    } catch (apiError) {
      setError(apiErrorMessage(apiError));
    }
  }

  return (
    <Modal open onClose={onClose} title={`Bekukan ${board.name}?`}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-text-muted">
          Board yang dibekukan tidak bisa dibuka, dicari, atau menerima laporan baru.
        </p>
        {board.verification === 'OFFICIAL' && (
          <Alert tone="warning">Status Official Board ini akan ikut dicabut.</Alert>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Alasan pembekuan
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
            Bekukan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
