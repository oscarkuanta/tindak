import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { Alert, Button, Card, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { useToast } from '../../features/boards/toastContext.js';
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useMyInvitations,
} from '../../features/invitations/hooks.js';

export function InvitationsPage() {
  const invitationsQuery = useMyInvitations();
  const acceptMutation = useAcceptInvitation();
  const declineMutation = useDeclineInvitation();
  const { showToast } = useToast();
  const [actionError, setActionError] = useState('');
  const invitations = invitationsQuery.data?.data ?? [];

  async function respond(invitation, decision) {
    const action = decision === 'accept' ? acceptMutation : declineMutation;
    setActionError('');
    try {
      await action.mutateAsync(invitation.id);
      showToast(decision === 'accept' ? 'Undangan diterima.' : 'Undangan ditolak.');
    } catch (error) {
      setActionError(error.message || 'Undangan belum dapat diproses.');
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-brand">Kelola permintaan bergabung</p>
        <h1 className="mt-1 text-2xl font-bold">Undangan Penindak</h1>
      </header>

      {invitationsQuery.isPending && (
        <div className="py-10">
          <Spinner label="Memuat undangan" />
        </div>
      )}
      {invitationsQuery.isError && <Alert>{invitationsQuery.error.message}</Alert>}
      {actionError && <Alert>{actionError}</Alert>}
      {!invitationsQuery.isPending && !invitationsQuery.isError && invitations.length === 0 && (
        <EmptyState
          title="Tidak ada undangan baru"
          description="Undangan menjadi Penindak akan muncul di sini."
          action={
            <Link to="/cari" className="text-sm font-semibold text-brand hover:underline">
              Cari Board
            </Link>
          }
        />
      )}
      {!invitationsQuery.isPending && invitations.length > 0 && (
        <ul className="flex flex-col gap-3">
          {invitations.map((invitation) => {
            const busy =
              (acceptMutation.isPending && acceptMutation.variables === invitation.id) ||
              (declineMutation.isPending && declineMutation.variables === invitation.id);
            return (
              <li key={invitation.id}>
                <Card className="invitation-card relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-text-muted">Kamu diundang menjadi Penindak di</p>
                    <Link
                      to={`/b/${invitation.board.slug}`}
                      aria-label={`Buka Board ${invitation.board.name}`}
                      className="invitation-card__link mt-0.5 inline-flex items-center gap-1 text-lg font-bold text-text hover:text-brand"
                    >
                      {invitation.board.name}
                      <ArrowRight size={18} weight="bold" aria-hidden="true" />
                    </Link>
                    <p className="mt-1 text-xs text-text-muted">
                      {invitation.board.city} · Klik kartu untuk melihat Board sebelum menjawab
                    </p>
                  </div>
                  <div className="relative z-10 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      loading={
                        acceptMutation.isPending && acceptMutation.variables === invitation.id
                      }
                      disabled={busy}
                      onClick={() => respond(invitation, 'accept')}
                    >
                      Terima
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={
                        declineMutation.isPending && declineMutation.variables === invitation.id
                      }
                      disabled={busy}
                      onClick={() => respond(invitation, 'decline')}
                    >
                      Tolak
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
