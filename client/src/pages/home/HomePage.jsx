import { useState } from 'react';
import { ArrowFatUp, ClipboardText, MapPin, WarningOctagon } from '@phosphor-icons/react';
import { Alert, Button, Card, Spinner, StatCard, Tabs } from '../../components/ui/index.js';
import { CitySelect } from '../../components/boards/CitySelect.jsx';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { ReportCard } from '../../components/reports/ReportCard.jsx';
import { useMe } from '../../features/auth/hooks.js';
import { useMyFollows } from '../../features/boards/hooks.js';
import { useHomeFeed } from '../../features/feed/hooks.js';
import { useMyCity } from '../../features/location/myCity.js';

const PAGE_SIZE = 10;
const TAB_LABELS = { following: 'Diikuti', nearby: 'Sekitarmu', hot: 'Ramai' };
const DESCRIPTIONS = {
  following: 'Laporan terbaru dari Board yang kamu ikuti.',
  nearby: 'Laporan dari Board di kotamu, yang paling ramai didukung lebih dulu.',
  hot: 'Laporan yang paling banyak didukung dari seluruh kota dalam 48 jam terakhir.',
};

function CityPicker({ city, isGuess, onChange }) {
  const [editing, setEditing] = useState(!city);
  if (city && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <MapPin size={18} weight="fill" className="text-brand" aria-hidden="true" />
        <span>
          Kotamu: <strong>{city}</strong>
          {isGuess && <span className="text-text-muted"> (dari Board yang kamu ikuti)</span>}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-semibold text-brand hover:underline"
        >
          Ganti kota
        </button>
      </div>
    );
  }
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-semibold">Di kota mana kamu tinggal?</h2>
      <p className="text-sm text-text-muted">
        Pilih kotamu agar Beranda menampilkan laporan di sekitarmu dulu, bukan dari kota lain.
      </p>
      <CitySelect
        id="home-city"
        label="Kotamu"
        value={city ?? ''}
        onChange={(value) => {
          if (!value) return;
          onChange(value);
          setEditing(false);
        }}
      />
      {city && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="self-start text-sm font-semibold text-text-muted hover:underline"
        >
          Batal, tetap di {city}
        </button>
      )}
    </Card>
  );
}

function Feed({ tab, city }) {
  const [page, setPage] = useState(1);
  const query = useHomeFeed({ tab, city, page, pageSize: PAGE_SIZE });
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
          icon={ClipboardText}
          tone="blue"
        />
        <StatCard
          label="Berbahaya"
          value={dangerousCount}
          note="Di halaman ini"
          icon={WarningOctagon}
          tone="red"
        />
        <StatCard
          label="Total dukungan"
          value={supportCount}
          note="Di halaman ini"
          icon={ArrowFatUp}
          tone="mint"
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
              : tab === 'nearby'
                ? `Belum ada laporan di ${city}. Jadilah yang pertama melaporkan masalah di sekitarmu.`
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
  const { city, isGuess, setCity } = useMyCity();
  const [selectedTab, setSelectedTab] = useState(null);

  if (userPending || (user && followsQuery.isPending)) return <Spinner label="Memuat Beranda" />;

  const tabs = [...(hasFollows ? ['following'] : []), 'nearby', 'hot'];
  const tab = selectedTab ?? (city || !hasFollows ? 'nearby' : 'following');
  const feedTab = tab === 'nearby' && !city ? 'hot' : tab;

  return (
    <section className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">Beranda</h1>
        <p className="mt-1 text-sm text-text-muted">{DESCRIPTIONS[tab]}</p>
      </header>

      <Tabs
        items={tabs.map((value) => ({ value, label: TAB_LABELS[value] }))}
        value={tab}
        onChange={setSelectedTab}
        label="Pilih feed"
      />

      {tab === 'nearby' && (
        <CityPicker key={city ?? ''} city={city} isGuess={isGuess} onChange={setCity} />
      )}

      {tab === 'nearby' && !city && (
        <p className="text-sm text-text-muted">
          Sambil memilih kota, berikut laporan yang sedang ramai dari semua kota.
        </p>
      )}

      <Feed
        key={`${feedTab}-${city ?? ''}`}
        tab={feedTab}
        city={feedTab === 'nearby' ? city : undefined}
      />
    </section>
  );
}
