import { useState } from 'react';
import { ArrowCounterClockwise, SealCheck, SkipForward } from '@phosphor-icons/react';
import {
  VERIFICATION_RULES,
  revokeVerificationRequestSchema,
  skipBoardRequestSchema,
  verifyBoardRequestSchema,
} from '@tindak/shared';
import { Alert, Button, Modal } from '../ui/index.js';
import { useRevokeVerification, useSkipBoard, useVerifyBoard } from '../../features/trust/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { apiErrorMessage } from '../../features/auth/formErrors.js';

const TEXTAREA_CLASS =
  'w-full rounded-base border border-border bg-surface px-3 py-2 text-sm font-normal focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

function ActionModal({
  title,
  label,
  schema,
  field,
  mutation,
  board,
  submitLabel,
  submitVariant = 'primary',
  submitIcon: SubmitIcon,
  submitClassName,
  successMessage,
  onClose,
  children,
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = schema.safeParse({ [field]: text.trim() || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    try {
      const result = await mutation.mutateAsync({ slug: board.slug, ...parsed.data });
      showToast(successMessage(result.data));
      onClose();
    } catch (apiError) {
      setError(apiErrorMessage(apiError));
    }
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {children}
        <label className="flex flex-col gap-1 text-sm font-medium">
          {label}
          <textarea
            rows={3}
            maxLength={500}
            className={TEXTAREA_CLASS}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            variant={submitVariant}
            className={submitClassName}
            loading={mutation.isPending}
          >
            {SubmitIcon && <SubmitIcon size={18} weight="fill" aria-hidden="true" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function VerifyModal({ board, failedRequirements = [], onClose }) {
  return (
    <ActionModal
      title={`Jadikan ${board.name} Official?`}
      label="Catatan keputusan"
      schema={verifyBoardRequestSchema}
      field="note"
      mutation={useVerifyBoard()}
      board={board}
      submitLabel="Jadikan Official"
      submitIcon={SealCheck}
      submitClassName="action-btn-official"
      successMessage={() => `${board.name} sekarang Official`}
      onClose={onClose}
    >
      <p className="text-sm text-text-muted">
        Board akan mendapat centang Official dan naik di urutan pencarian.
      </p>
      {failedRequirements.length > 0 && (
        <Alert tone="warning">
          Syarat kandidat yang belum terpenuhi:
          <ul className="mt-1 list-disc pl-5">
            {failedRequirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Alert>
      )}
    </ActionModal>
  );
}

export function SkipModal({ board, onClose }) {
  return (
    <ActionModal
      title={`Lewati ${board.name}?`}
      label="Catatan (opsional)"
      schema={skipBoardRequestSchema}
      field="note"
      mutation={useSkipBoard()}
      board={board}
      submitLabel="Lewati"
      submitIcon={SkipForward}
      submitVariant="secondary"
      successMessage={() => `${board.name} dilewati`}
      onClose={onClose}
    >
      <p className="text-sm text-text-muted">
        Board keluar dari antrean kandidat selama {VERIFICATION_RULES.SKIP_COOLDOWN_DAYS} hari, lalu
        muncul lagi jika masih memenuhi syarat.
      </p>
    </ActionModal>
  );
}

export function RevokeModal({ board, onClose }) {
  return (
    <ActionModal
      title={`Cabut Official ${board.name}?`}
      label="Alasan pencabutan"
      schema={revokeVerificationRequestSchema}
      field="reason"
      mutation={useRevokeVerification()}
      board={board}
      submitLabel="Cabut Official"
      submitIcon={ArrowCounterClockwise}
      submitVariant="danger"
      successMessage={() => `Status Official ${board.name} dicabut`}
      onClose={onClose}
    >
      <p className="text-sm text-text-muted">
        Board kembali menjadi Komunitas. Alasan ini terlihat oleh Penindak Utama Board.
      </p>
    </ActionModal>
  );
}
