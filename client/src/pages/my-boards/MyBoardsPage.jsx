import { Link, useNavigate } from 'react-router';
import { BOARD_CREATION_LIMIT, BOARD_ROLE_LABELS } from '@tindak/shared';
import { Alert, Button, Card, Spinner } from '../../components/ui/index.js';
import { BoardCard } from '../../components/boards/BoardCard.jsx';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { useMyBoards } from '../../features/boards/hooks.js';

export function MyBoardsPage() {
  const boardsQuery = useMyBoards();
  const navigate = useNavigate();
  const memberships = boardsQuery.data?.data ?? [];
  const ownedCount = memberships.filter(({ role }) => role === 'OWNER').length;
  const limitReached = ownedCount >= BOARD_CREATION_LIMIT;

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand">Ruang yang kamu bantu</p>
          <h1 className="mt-1 text-2xl font-bold">Board Saya</h1>
        </div>
        <Button
          disabled={limitReached || boardsQuery.isPending}
          onClick={() => navigate('/buat-board')}
        >
          Buat Board
        </Button>
      </header>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {ownedCount} dari {BOARD_CREATION_LIMIT} Board dibuat
        </p>
        {limitReached && (
          <p className="text-xs text-text-muted">
            Kamu sudah mencapai batas Board yang dapat dibuat.
          </p>
        )}
      </Card>

      {boardsQuery.isPending && (
        <div className="py-10">
          <Spinner label="Memuat Board Saya" />
        </div>
      )}
      {boardsQuery.isError && (
        <Alert>
          {boardsQuery.error.message}{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => boardsQuery.refetch()}
          >
            Coba lagi
          </button>
        </Alert>
      )}
      {!boardsQuery.isPending && !boardsQuery.isError && memberships.length === 0 && (
        <EmptyState
          title="Kamu belum tergabung di Board"
          description="Board yang kamu buat atau bantu sebagai Penindak akan tampil di sini."
          action={
            <Link
              to="/buat-board"
              className="inline-flex h-10 items-center rounded-base bg-brand px-4 text-sm font-semibold text-brand-contrast"
            >
              Buat Board
            </Link>
          }
        />
      )}
      {!boardsQuery.isPending && memberships.length > 0 && (
        <div className="flex flex-col gap-3">
          {memberships.map(({ board, role }) => {
            const boardWithRole = {
              ...board,
              viewer: { ...board.viewer, role },
            };
            return (
              <div key={board.id} className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="min-w-0 flex-1">
                  <BoardCard board={boardWithRole} showFollowButton={false} />
                </div>
                <div className="flex shrink-0 flex-col justify-center gap-2 rounded-base border border-border bg-surface p-3 sm:w-48">
                  <span className="text-xs font-medium text-text-muted">Peran</span>
                  <span className="text-sm font-semibold">
                    {BOARD_ROLE_LABELS[role] ?? 'Penindak'}
                  </span>
                  <Link
                    className="text-sm font-medium text-brand hover:underline"
                    to={`/b/${board.slug}`}
                  >
                    Buka Board
                  </Link>
                  {role === 'OWNER' && (
                    <Link
                      className="text-sm font-medium text-brand hover:underline"
                      to={`/b/${board.slug}/pengaturan`}
                    >
                      Pengaturan
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
