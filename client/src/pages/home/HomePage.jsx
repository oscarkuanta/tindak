import { useState } from 'react';
import { Link } from 'react-router';
import { Alert, Button, Card, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { VerificationBadge } from '../../components/boards/BoardBadges.jsx';
import { ReportCard } from '../../components/reports/ReportCard.jsx';
import { useMe } from '../../features/auth/hooks.js';
import { useMyFollows } from '../../features/boards/hooks.js';
import { useHomeFeed, usePopularBoards } from '../../features/feed/hooks.js';
import { cn } from '../../lib/cn.js';

const PAGE_SIZE = 10;
const TABS = [
  { id: 'following', label: 'Diikuti' },
  { id: 'hot', label: 'Ramai' },
];

function PopularBoards() {
  const query = usePopularBoards();
  const boards = query.data?.data ?? [];
  if (query.isPending) return <Spinner label="Memuat Board populer" />;
  if (!boards.length) return null;
  return (
    <Card>
      <h2 className="font-semibold">Board Populer</h2>
      <ul className="mt-3 flex flex-col divide-y divide-border">
        {boards.map((board) => (
          <li key={board.id} className="py-2">
            <Link to={`/b/${board.slug}`} className="group flex flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium group-hover:text-brand">
                {board.name}
                <VerificationBadge verification={board.verification} size="sm" />
              </span>
              <span className="text-xs text-text-muted">
                {board.city} · {board.followerCount} pengikut · {board.activeReportCount} laporan
                aktif
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Feed({ tab }) {
  const [page, setPage] = useState(1);
  const query = useHomeFeed({ tab, page, pageSize: PAGE_SIZE });
  if (query.isPending) return <Spinner label="Memuat laporan" />;
  if (query.isError) return <Alert>{query.error.message}</Alert>;
  const reports = query.data.data;
  const meta = query.data.meta;
  if (!reports.length) {
    return (
      <EmptyState
        title="Belum ada laporan"
        description={
          tab === 'following'
            ? 'Board yang kamu ikuti belum punya laporan.'
            : 'Jadilah yang pertama melaporkan masalah di sekitarmu.'
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} showBoard />
      ))}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-text-muted">
            Halaman {meta.page} dari {meta.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const { data: user, isPending: userPending } = useMe();
  const followsQuery = useMyFollows({ enabled: Boolean(user) });
  const hasFollows = (followsQuery.data?.data ?? []).length > 0;
  const [selectedTab, setSelectedTab] = useState(null);

  if (userPending || (user && followsQuery.isPending)) return <Spinner label="Memuat Beranda" />;

  const tab = hasFollows ? (selectedTab ?? 'following') : 'hot';

  return (
    <section className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">Beranda</h1>
        <p className="mt-1 text-sm text-text-muted">
          {hasFollows
            ? 'Laporan terbaru dari Board yang kamu ikuti dan yang sedang ramai.'
            : 'Laporan yang paling banyak didukung dalam 48 jam terakhir.'}
        </p>
      </header>

      {hasFollows && (
        <div role="tablist" aria-label="Pilih feed" className="flex border-b border-border">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setSelectedTab(item.id)}
              className={cn(
                'border-b-2 px-4 py-3 text-sm font-medium',
                tab === item.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-muted hover:text-text',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {!hasFollows && <PopularBoards />}
      <Feed key={tab} tab={tab} />
    </section>
  );
}
