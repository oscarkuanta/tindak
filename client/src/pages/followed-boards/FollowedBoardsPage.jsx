import { Link } from 'react-router';
import { FOLLOW_NOTIFY_LEVEL_LABELS } from '@tindak/shared';
import { Alert, Card, Spinner } from '../../components/ui/index.js';
import { BoardCard } from '../../components/boards/BoardCard.jsx';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { useMyFollows } from '../../features/boards/hooks.js';

export function FollowedBoardsPage() {
  const followsQuery = useMyFollows();
  const follows = followsQuery.data?.data ?? [];

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-brand">Board pilihanmu</p>
        <h1 className="mt-1 text-2xl font-bold">Board Diikuti</h1>
        <p className="mt-1 text-sm text-text-muted">
          Atur notifikasi atau buka Board yang kamu ikuti.
        </p>
      </header>

      {followsQuery.isPending && (
        <div className="py-10">
          <Spinner label="Memuat Board yang diikuti" />
        </div>
      )}
      {followsQuery.isError && (
        <Alert>
          {followsQuery.error.message}{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => followsQuery.refetch()}
          >
            Coba lagi
          </button>
        </Alert>
      )}
      {!followsQuery.isPending && !followsQuery.isError && follows.length === 0 && (
        <EmptyState
          title="Kamu belum mengikuti Board"
          description="Ikuti Board agar lebih mudah menemukan laporan dari wilayah dan komunitas pilihanmu."
          action={
            <Link
              to="/cari"
              className="inline-flex h-10 items-center rounded-base bg-brand px-4 text-sm font-semibold text-brand-contrast"
            >
              Cari Board
            </Link>
          }
        />
      )}
      {!followsQuery.isPending && follows.length > 0 && (
        <div className="flex flex-col gap-3">
          {follows.map((follow) => {
            const board = {
              ...follow.board,
              viewer: {
                ...follow.board.viewer,
                isFollowing: true,
                notifyLevel: follow.notifyLevel,
              },
            };
            return (
              <div key={board.id ?? board.slug} className="flex flex-col gap-2">
                <BoardCard board={board} />
                <Card className="px-4 py-3 text-sm text-text-muted">
                  Notifikasi:{' '}
                  <span className="font-medium text-text">
                    {FOLLOW_NOTIFY_LEVEL_LABELS[follow.notifyLevel] ?? follow.notifyLevel}
                  </span>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
