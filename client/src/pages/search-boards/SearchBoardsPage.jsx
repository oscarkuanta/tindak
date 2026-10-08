import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BOARD_TYPE_LABELS, BOARD_TYPES, BOARD_VERIFICATIONS } from '@tindak/shared';
import { Alert, Button, Card, Input } from '../../components/ui/index.js';
import { BoardCard } from '../../components/boards/BoardCard.jsx';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { BoardCardSkeleton } from '../../components/boards/Skeleton.jsx';
import { useLoginPrompt } from '../../features/auth/loginPromptContext.js';
import { useMe } from '../../features/auth/hooks.js';
import { useCities, useBoardSearch } from '../../features/boards/hooks.js';

const PAGE_SIZE = 20;

function SearchForm({ initialQuery, onSearch }) {
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draftQuery.trim());
      }}
      className="flex gap-2"
    >
      <div className="min-w-0 flex-1">
        <Input
          label="Cari nama Board"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          placeholder="Contoh: Jalan Rungkut"
        />
      </div>
      <Button type="submit" className="self-end">
        Cari
      </Button>
    </form>
  );
}

export function SearchBoardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openLoginPrompt } = useLoginPrompt();
  const { data: user } = useMe();
  const { data: citiesResponse } = useCities();

  const params = useMemo(
    () => ({
      q: searchParams.get('q') ?? '',
      city: searchParams.get('city') ?? '',
      scopeType: searchParams.get('scopeType') ?? '',
      verification: searchParams.get('verification') ?? '',
      page: Number(searchParams.get('page') || 1),
      pageSize: PAGE_SIZE,
    }),
    [searchParams],
  );
  const searchQuery = useBoardSearch(params);
  const boards = searchQuery.data?.data ?? [];
  const meta = searchQuery.data?.meta;
  const cities = citiesResponse?.data ?? [];

  function updateFilters(updates) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!Object.hasOwn(updates, 'page')) next.delete('page');
    setSearchParams(next);
  }

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-brand">Jelajahi komunitas</p>
        <h1 className="mt-1 text-2xl font-bold">Cari Board</h1>
      </header>

      <SearchForm
        key={searchParams.get('q') ?? ''}
        initialQuery={searchParams.get('q') ?? ''}
        onSearch={(query) => updateFilters({ q: query })}
      />

      <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <Card as="aside" className="h-fit min-w-0">
          <h2 className="font-semibold">Filter</h2>
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Kota
              <select
                aria-label="Filter kota"
                value={params.city}
                onChange={(event) => updateFilters({ city: event.target.value })}
                className="h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 text-sm font-normal"
              >
                <option value="">Semua kota</option>
                {cities.map((city) => (
                  <option key={`${city.province}-${city.name}`} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Jenis Board
              <select
                aria-label="Filter jenis Board"
                value={params.scopeType}
                onChange={(event) => updateFilters({ scopeType: event.target.value })}
                className="h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 text-sm font-normal"
              >
                <option value="">Semua jenis</option>
                {BOARD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BOARD_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Verifikasi
              <select
                aria-label="Filter verifikasi"
                value={params.verification}
                onChange={(event) => updateFilters({ verification: event.target.value })}
                className="h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 text-sm font-normal"
              >
                <option value="">Semua</option>
                {BOARD_VERIFICATIONS.map((verification) => (
                  <option key={verification} value={verification}>
                    {verification === 'OFFICIAL' ? 'Official' : 'Komunitas'}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
          {searchQuery.isError && (
            <Alert>
              {searchQuery.error.message}{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => searchQuery.refetch()}
              >
                Coba lagi
              </button>
            </Alert>
          )}
          {searchQuery.isPending ? (
            Array.from({ length: 4 }, (_, index) => <BoardCardSkeleton key={index} />)
          ) : boards.length ? (
            <>
              <p className="text-sm text-text-muted">
                {meta?.total ?? boards.length} Board ditemukan
              </p>
              {boards.map((board) => (
                <BoardCard key={board.id} board={board} />
              ))}
              {meta?.totalPages > 1 && (
                <nav
                  aria-label="Halaman hasil pencarian"
                  className="mt-2 flex items-center justify-between"
                >
                  <Button
                    variant="secondary"
                    disabled={params.page <= 1}
                    onClick={() => updateFilters({ page: String(params.page - 1) })}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-text-muted">
                    Halaman {meta.page} dari {meta.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={params.page >= meta.totalPages}
                    onClick={() => updateFilters({ page: String(params.page + 1) })}
                  >
                    Berikutnya
                  </Button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              title="Belum ada Board yang cocok"
              description="Coba ubah filter, atau mulai Board baru untuk lingkunganmu."
              action={
                <Link
                  to="/buat-board"
                  onClick={(event) => {
                    if (!user) {
                      event.preventDefault();
                      openLoginPrompt({ title: 'Masuk untuk membuat Board' });
                    }
                  }}
                  className="inline-flex h-10 items-center rounded-base bg-brand px-4 text-sm font-semibold text-brand-contrast"
                >
                  Buat Board baru
                </Link>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
