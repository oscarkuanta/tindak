import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Alert, Button, Card, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { ScopeBadge, VerificationBadge } from '../../components/boards/BoardBadges.jsx';
import { FollowButton } from '../../components/boards/FollowButton.jsx';
import { useBoard } from '../../features/boards/hooks.js';
import { useBoardReports } from '../../features/reports/hooks.js';
import { ReportCard } from '../../components/reports/ReportCard.jsx';

const FEED_TABS = [
  { label: 'Ramai', sort: 'hot' },
  { label: 'Prioritas', sort: 'priority' },
  { label: 'Terbaru', sort: 'new' },
  { label: 'Selesai', sort: 'new', status: 'RESOLVED' },
];

function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('id-ID');
}

function VerificationPanel({ board }) {
  return (
    <Card>
      <h2 className="font-semibold">Status Verifikasi</h2>
      <div className="mt-3">
        <VerificationBadge verification={board.verification} />
      </div>
      {board.verification === 'OFFICIAL' ? (
        <p className="mt-3 text-sm text-text-muted">
          Diverifikasi Admin Board sejak{' '}
          {board.verifiedAt
            ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                new Date(board.verifiedAt),
              )
            : 'tanggal belum tersedia'}
          .
        </p>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          Board baru mulai sebagai Komunitas. Admin Board dapat memberikan status Official setelah
          Board dipercaya pengguna.
        </p>
      )}
    </Card>
  );
}

function BoardInformation({ board }) {
  return (
    <aside className="flex flex-col gap-4" aria-label="Informasi Board">
      <VerificationPanel board={board} />
      <Card>
        <h2 className="font-semibold">Tentang Board</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">
          {board.description || 'Deskripsi Board belum tersedia.'}
        </p>
        {board.managerTitle && (
          <p className="mt-3 text-sm">
            <span className="text-text-muted">Jabatan pengelola:</span> {board.managerTitle}
          </p>
        )}
      </Card>
      <Card>
        <h2 className="font-semibold">Statistik</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Pengikut</dt>
            <dd>{board.followerCount ?? 'Belum ada data'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Laporan aktif</dt>
            <dd>{board.activeReportCount ?? 'Belum ada data'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Tingkat tanggap</dt>
            <dd>{board.responseRate ? `${board.responseRate}%` : 'Belum ada data'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Pemilik</dt>
            <dd>{board.owner?.name || 'Belum ada data'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Penindak</dt>
            <dd>{board.handlerCount ?? 'Belum ada data'}</dd>
          </div>
        </dl>
      </Card>
      <Card>
        <h2 className="font-semibold">Kategori</h2>
        {board.categories?.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {board.categories.map((category) => (
              <li
                key={category.id}
                className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-text-muted"
              >
                {category.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-text-muted">Belum ada kategori.</p>
        )}
      </Card>
    </aside>
  );
}

export function BoardDetailPage() {
  const { slug } = useParams();
  const boardQuery = useBoard(slug);
  const [activeTab, setActiveTab] = useState(FEED_TABS[0]);
  const [page, setPage] = useState(1);
  const reportsQuery = useBoardReports(slug, {
    sort: activeTab.sort,
    ...(activeTab.status ? { status: activeTab.status } : {}),
    page,
    pageSize: 10,
  });

  if (boardQuery.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner label="Memuat Board" />
      </div>
    );
  }
  if (boardQuery.error?.code === 'BOARD_NOT_FOUND' || boardQuery.error?.status === 404) {
    return (
      <EmptyState
        title="Board tidak ditemukan"
        description="Periksa kembali alamat Board atau cari Board lain."
        action={
          <Link
            to="/cari"
            className="inline-flex h-10 items-center rounded-base bg-brand px-4 text-sm font-semibold text-brand-contrast"
          >
            Cari Board
          </Link>
        }
      />
    );
  }
  if (boardQuery.isError) {
    return (
      <Alert>
        {boardQuery.error.message}{' '}
        <button
          className="font-semibold underline"
          type="button"
          onClick={() => boardQuery.refetch()}
        >
          Coba lagi
        </button>
      </Alert>
    );
  }

  const board = boardQuery.data.data;
  const isOwner = board.viewer?.role === 'OWNER';
  const isHandler = board.viewer?.role === 'HANDLER';

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <main className="min-w-0">
        <Card className="overflow-visible p-0">
          {board.coverImageUrl ? (
            <img
              src={board.coverImageUrl}
              alt=""
              className="h-32 w-full rounded-t-base object-cover sm:h-44"
            />
          ) : (
            <div
              className="flex h-32 items-center justify-center rounded-t-base bg-brand-soft text-4xl font-bold text-brand sm:h-44"
              aria-hidden="true"
            >
              {getInitials(board.name)}
            </div>
          )}
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{board.name}</h1>
              <VerificationBadge verification={board.verification} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
              <span>{board.city}</span>
              <span aria-hidden="true">·</span>
              <ScopeBadge type={board.type} />
            </div>
            {board.managerTitle && (
              <p className="mt-2 text-sm text-text-muted">{board.managerTitle}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/b/${slug}/lapor`}
                className="inline-flex h-10 items-center rounded-base bg-brand px-4 text-sm font-semibold text-brand-contrast hover:bg-brand-hover"
              >
                Laporkan Masalah
              </Link>
              <FollowButton board={board} />
              {(isOwner || isHandler) && (
                <Link
                  className="inline-flex h-10 items-center rounded-base border border-border px-4 text-sm font-semibold hover:bg-surface-muted"
                  to={`/b/${slug}/antrean`}
                >
                  Antrean Laporan
                </Link>
              )}
              {isOwner && (
                <Link
                  className="inline-flex h-10 items-center rounded-base border border-border px-4 text-sm font-semibold hover:bg-surface-muted"
                  to={`/b/${slug}/pengaturan`}
                >
                  Pengaturan Board
                </Link>
              )}
            </div>
          </div>
        </Card>

        <nav
          role="tablist"
          aria-label="Urutkan laporan"
          className="mt-5 flex gap-1 overflow-x-auto border-b border-border"
        >
          {FEED_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={activeTab.label === tab.label}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab.label === tab.label ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 flex flex-col gap-3" aria-live="polite">
          {reportsQuery.isPending ? (
            Array.from({ length: 3 }, (_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="h-4 w-1/3 rounded bg-surface-muted" />
                <div className="mt-4 h-5 w-2/3 rounded bg-surface-muted" />
                <div className="mt-3 h-3 w-1/2 rounded bg-surface-muted" />
              </Card>
            ))
          ) : reportsQuery.isError ? (
            <Alert>
              {reportsQuery.error.message}{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => reportsQuery.refetch()}
              >
                Coba lagi
              </button>
            </Alert>
          ) : reportsQuery.data.data.length ? (
            <>
              {reportsQuery.data.data.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
              {reportsQuery.data.meta?.totalPages > 1 && (
                <nav
                  aria-label="Halaman laporan Board"
                  className="flex items-center justify-between"
                >
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-text-muted">
                    Halaman {reportsQuery.data.meta.page ?? page} dari{' '}
                    {reportsQuery.data.meta.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={page >= reportsQuery.data.meta.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Berikutnya
                  </Button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              title="Belum ada laporan di Board ini"
              description="Laporan yang masuk akan muncul di sini."
            />
          )}
        </div>
      </main>
      <BoardInformation board={board} />
    </div>
  );
}
