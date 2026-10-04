import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BOARD_MEMBER_STATUS_LABELS,
  inviteHandlerSchema,
  transferOwnershipSchema,
} from '@tindak/shared';
import { Alert, Button, Card, Input, Modal, Spinner } from '../ui/index.js';
import { useToast } from '../../features/boards/toastContext.js';
import {
  useBoardHandlers,
  useInviteBoardHandler,
  useRemoveBoardHandler,
  useTransferBoardOwnership,
} from '../../features/boards/hooks.js';

export function HandlerInviteForm({ slug, disabled = false }) {
  const inviteMutation = useInviteBoardHandler(slug);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const result = inviteHandlerSchema.safeParse({ email });
    if (!result.success) {
      setMessage(result.error.issues[0].message);
      setIsError(true);
      return;
    }
    setMessage('');
    try {
      await inviteMutation.mutateAsync(result.data);
      setEmail('');
      setMessage('Undangan Penindak berhasil dikirim.');
      setIsError(false);
    } catch (error) {
      setMessage(error.message || 'Undangan belum dapat dikirim.');
      setIsError(true);
    }
  }

  return (
    <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submit} noValidate>
      <Input
        label="Email akun yang akan diundang"
        type="email"
        autoComplete="email"
        value={email}
        error={isError ? message : undefined}
        hint={!isError ? message : undefined}
        disabled={disabled || inviteMutation.isPending}
        onChange={(event) => {
          setEmail(event.target.value);
          setMessage('');
        }}
      />
      <Button type="submit" loading={inviteMutation.isPending} disabled={disabled}>
        Undang Penindak
      </Button>
    </form>
  );
}

export function HandlerManagement({ slug, boardName }) {
  const handlersQuery = useBoardHandlers(slug);
  const removeMutation = useRemoveBoardHandler(slug);
  const transferMutation = useTransferBoardOwnership(slug);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [memberToTransfer, setMemberToTransfer] = useState(null);
  const [typedBoardName, setTypedBoardName] = useState('');
  const [actionError, setActionError] = useState('');
  const members = handlersQuery.data?.data ?? [];
  const atLimit = members.length >= 10;

  async function removeMember() {
    if (!memberToRemove) return;
    setActionError('');
    try {
      await removeMutation.mutateAsync(memberToRemove.userId);
      setMemberToRemove(null);
      showToast('Akses Penindak berhasil dicabut.');
    } catch (error) {
      setActionError(error.message || 'Akses Penindak belum dapat dicabut.');
    }
  }

  async function transferOwnership(event) {
    event.preventDefault();
    if (typedBoardName !== boardName) return;
    const result = transferOwnershipSchema.safeParse({ userId: memberToTransfer?.userId });
    if (!result.success) {
      setActionError(result.error.issues[0].message);
      return;
    }
    setActionError('');
    try {
      await transferMutation.mutateAsync(result.data.userId);
      showToast('Kepemilikan Board berhasil dialihkan.');
      navigate(`/b/${slug}`);
    } catch (error) {
      setActionError(error.message || 'Kepemilikan Board belum dapat dialihkan.');
    }
  }

  return (
    <Card as="section">
      <h2 className="text-lg font-semibold">Penindak</h2>
      <p className="mt-1 text-sm text-text-muted">
        Undang pengguna terdaftar untuk membantu menangani laporan. Maksimal 10 Penindak.
      </p>
      <div className="mt-4">
        <HandlerInviteForm slug={slug} disabled={atLimit} />
        {atLimit && (
          <p className="mt-2 text-xs text-text-muted">
            Batas 10 Penindak di Board ini sudah tercapai.
          </p>
        )}
      </div>

      {actionError && !memberToRemove && !memberToTransfer && (
        <Alert className="mt-4">{actionError}</Alert>
      )}
      {handlersQuery.isPending && (
        <div className="py-6">
          <Spinner label="Memuat daftar Penindak" />
        </div>
      )}
      {handlersQuery.isError && <Alert className="mt-4">{handlersQuery.error.message}</Alert>}
      {!handlersQuery.isPending && !handlersQuery.isError && (
        <>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <h3 className="font-semibold">Daftar Penindak</h3>
            <span className="text-xs text-text-muted">{members.length} dari 10</span>
          </div>
          {members.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">Belum ada Penindak yang diundang.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {members.map((member) => (
                <li
                  key={member.userId}
                  className="flex flex-col gap-3 rounded-base border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {member.user?.name || member.user?.email || 'Pengguna'}
                    </p>
                    {member.user?.email && (
                      <p className="truncate text-xs text-text-muted">{member.user.email}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border bg-surface-muted px-2 py-1 text-xs text-text-muted">
                      {BOARD_MEMBER_STATUS_LABELS[member.status] ?? member.status}
                    </span>
                    {member.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setMemberToTransfer(member);
                          setTypedBoardName('');
                          setActionError('');
                        }}
                      >
                        Alihkan kepemilikan
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={removeMutation.isPending}
                      onClick={() => {
                        setMemberToRemove(member);
                        setActionError('');
                      }}
                    >
                      {member.status === 'INVITED' ? 'Batalkan undangan' : 'Cabut Penindak'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Modal
        open={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        title={memberToRemove?.status === 'INVITED' ? 'Batalkan undangan?' : 'Cabut Penindak?'}
      >
        <p className="text-sm text-text-muted">
          {memberToRemove?.user?.name || memberToRemove?.user?.email} tidak lagi dapat menangani
          laporan di Board ini.
        </p>
        {actionError && <Alert>{actionError}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setMemberToRemove(null)}>
            Batal
          </Button>
          <Button variant="danger" loading={removeMutation.isPending} onClick={removeMember}>
            Ya, cabut akses
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(memberToTransfer)}
        onClose={() => {
          setMemberToTransfer(null);
          setTypedBoardName('');
        }}
        title="Alihkan kepemilikan Board?"
      >
        <form className="flex flex-col gap-4" onSubmit={transferOwnership}>
          <p className="text-sm text-text-muted">
            {memberToTransfer?.user?.name || memberToTransfer?.user?.email} akan menjadi Penindak
            Utama. Kamu tidak lagi memiliki akses OWNER di Board ini. Status verifikasi Board tetap.
          </p>
          <Input
            label={`Ketik “${boardName}” untuk melanjutkan`}
            value={typedBoardName}
            autoComplete="off"
            onChange={(event) => setTypedBoardName(event.target.value)}
          />
          {actionError && <Alert>{actionError}</Alert>}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setMemberToTransfer(null);
                setTypedBoardName('');
              }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={transferMutation.isPending}
              disabled={typedBoardName !== boardName}
            >
              Alihkan kepemilikan
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
