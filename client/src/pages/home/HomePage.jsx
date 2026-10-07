import { useState } from 'react';
import { AlertCircle, Heart, ListChecks } from 'lucide-react';
import { Alert, Button, Spinner, StatCard, Tabs } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { ReportCard } from '../../components/reports/ReportCard.jsx';
import { useMe } from '../../features/auth/hooks.js';
import { useMyFollows } from '../../features/boards/hooks.js';
import { useHomeFeed } from '../../features/feed/hooks.js';

const PAGE_SIZE = 10;
const TABS = [
  { value: 'following', label: 'Diikuti' },
  { value: 'hot', label: 'Ramai' },
];

function Feed({ tab }) {
  const [page, setPage] = useState(1);
  const query = useHomeFeed({ tab, page, pageSize: PAGE_SIZE });
  if (query.isPending) return <Spinner label="Memuat laporan" />;
  if (query.isError) return <Alert>{query.error.message}</Alert>;
  const reports = query.data.data;
  const meta = query.data.meta;
  const dangerousCount = reports.filter((report) => report.severity === 'DANGEROUS').length;
  const supportCount = reports.reduce((total, report) => total + (report.supportCount ?? 0), 0);
  const summary = (
    <section
      aria-label="Ringkasan feed"
      className="rounded-card border border-border bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">Ringkasan laporan</h2>
          <p className="mt-1 text-xs text-text-muted">
            Angka mengikuti hasil yang sedang ditampilkan.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Laporan tampil"
          value={reports.length}
          note="Di halaman ini"
          icon={ListChecks}
        />
        <StatCard
          label="Berbahaya"
          value={dangerousCount}
          note="Di halaman ini"
          icon={AlertCircle}
          tone="cream"
        />
        <StatCard
          label="Total dukungan"
          value={supportCount}
          note="Di halaman ini"
          icon={Heart}
          tone="sky"
        />
      </div>
    </section>
  );
  if (!reports.length) {
    return (
      <div className="flex flex-col gap-4">
        {summary}
        <EmptyState
          title="Belum ada laporan"
          description={
            tab === 'following'
              ? 'Board yang kamu ikuti belum punya laporan.'
              : 'Jadilah yang pertama melaporkan masalah di sekitarmu.'
          }
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {summary}
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

      {hasFollows && <Tabs items={TABS} value={tab} onChange={setSelectedTab} label="Pilih feed" />}

      <Feed key={tab} tab={tab} />
    </section>
  );
}
