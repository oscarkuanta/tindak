import { useState } from 'react';
import { Activity, BadgeCheck, Clock3, Gauge, ListChecks, Siren } from 'lucide-react';
import { Link, useParams } from 'react-router';
import {
  REPORT_SEVERITY_LABELS,
  STATS_DEFAULT_RANGE,
  STATS_RANGES,
  STATS_RANGE_LABELS,
} from '@tindak/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  Spinner,
  StatCard as BaseStatCard,
} from '../../components/ui/index.js';
import { ReportStatusBadge } from '../../components/reports/ReportStatusBadge.jsx';
import { TrustBadge } from '../../components/boards/BoardBadges.jsx';
import { StarDistribution } from '../../components/trust/StarDistribution.jsx';
import { useBoardStats } from '../../features/stats/hooks.js';

function formatNumber(value) {
  return typeof value === 'number' ? value.toLocaleString('id-ID') : 'Belum ada data';
}

function formatHours(value) {
  if (typeof value !== 'number') return 'Belum ada data';
  return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} jam`;
}

function formatPercent(value) {
  if (typeof value !== 'number') return 'Belum ada data';
  return `${value.toLocaleString('id-ID')}%`;
}

function formatDays(value) {
  if (typeof value !== 'number') return 'Belum ada data';
  return `${value.toLocaleString('id-ID')} hari`;
}

function formatWeekStart(value, options = { day: 'numeric', month: 'short' }) {
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: 'Asia/Jakarta' }).format(date);
}

const STAT_ICONS = {
  'Total laporan': ListChecks,
  'Laporan aktif': Activity,
  'Laporan selesai': BadgeCheck,
  'Rata-rata waktu penanganan': Clock3,
  'Tingkat tanggap': Gauge,
  'Berbahaya tepat waktu': Siren,
};

function StatCard({ label, value, tone = 'brand' }) {
  const colorTone = tone === 'success' ? 'sky' : tone === 'danger' ? 'cream' : 'mint';
  return (
    <BaseStatCard
      label={label}
      value={value}
      tone={colorTone}
      icon={STAT_ICONS[label]}
      valueTestId={`stat-${label}`}
      className="min-w-0"
    />
  );
}

function StatusBadge({ status }) {
  return <ReportStatusBadge status={status} />;
}

function ReportTable({ title, description, reports, columns, empty }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      {reports.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="border-b border-border text-xs text-text-muted">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} scope="col" className="px-3 py-2 font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((report) => (
                <tr key={report.id}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3 align-top">
                      {column.render(report)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="text-sm text-text-muted">{empty}</Card>
      )}
    </section>
  );
}

function RatingSummary({ rating }) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Ringkasan rating</h2>
        <p className="mt-1 text-sm text-text-muted">Perkembangan dan skor Board saat ini.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TrustBadge label={rating.trustLabel} score={rating.trustScore} />
        <span className="text-sm text-text-muted">
          {formatNumber(rating.ratingCount)} rating
          {typeof rating.averageStars === 'number' &&
            ` · rata-rata ${rating.averageStars.toLocaleString('id-ID')} ★`}
        </span>
      </div>
      <StarDistribution distribution={rating.distribution} total={rating.ratingCount} />
      <p className="text-xs text-text-muted">
        Rating baru pada rentang ini: {formatNumber(rating.newRatings)}
      </p>
    </Card>
  );
}

function StatsContent({ data, slug }) {
  const lateColumns = [
    {
      key: 'report',
      label: 'Laporan',
      render: (report) => (
        <Link to={`/laporan/${report.id}`} className="font-medium hover:text-brand hover:underline">
          {report.title}
        </Link>
      ),
    },
    { key: 'status', label: 'Status', render: (report) => <StatusBadge status={report.status} /> },
    { key: 'late', label: 'Terlambat', render: (report) => formatHours(report.lateHours) },
  ];
  const activeColumns = [
    {
      key: 'report',
      label: 'Laporan',
      render: (report) => (
        <Link to={`/laporan/${report.id}`} className="font-medium hover:text-brand hover:underline">
          {report.title}
        </Link>
      ),
    },
    { key: 'status', label: 'Status', render: (report) => <StatusBadge status={report.status} /> },
    {
      key: 'severity',
      label: 'Bahaya',
      render: (report) => REPORT_SEVERITY_LABELS[report.severity] ?? report.severity,
    },
    { key: 'age', label: 'Lama aktif', render: (report) => formatDays(report.ageDays) },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Angka utama" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total laporan" value={formatNumber(data.totals.total)} />
        <StatCard label="Laporan aktif" value={formatNumber(data.totals.active)} />
        <StatCard
          label="Laporan selesai"
          value={formatNumber(data.totals.resolved)}
          tone="success"
        />
        <StatCard
          label="Rata-rata waktu penanganan"
          value={formatHours(data.handling.averageHours)}
        />
        <StatCard label="Tingkat tanggap" value={formatPercent(data.responseRate)} tone="success" />
        <StatCard
          label="Berbahaya tepat waktu"
          value={formatPercent(data.dangerous.onTimeRate)}
          tone={data.dangerous.onTimeRate === null ? 'brand' : 'danger'}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <h2 className="font-semibold">Laporan per kategori</h2>
          {data.categories.length ? (
            <div className="mt-4 h-80 min-w-0" role="img" aria-label="Grafik laporan per kategori">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.categories}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={132}
                    tickFormatter={(value) =>
                      value.length > 20 ? `${value.slice(0, 18)}…` : value
                    }
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface-muted)' }}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-base)',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Laporan"
                    fill="var(--color-brand)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">Belum ada data kategori.</p>
          )}
        </Card>

        <Card className="min-w-0">
          <h2 className="font-semibold">Tren laporan mingguan</h2>
          {data.weeklyTrend.length ? (
            <div className="mt-4 h-80 min-w-0" role="img" aria-label="Grafik tren laporan mingguan">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.weeklyTrend}
                  margin={{ top: 8, right: 12, bottom: 4, left: -16 }}
                >
                  <CartesianGrid stroke="var(--color-border)" />
                  <XAxis
                    dataKey="weekStart"
                    tickFormatter={formatWeekStart}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      formatWeekStart(value, { day: 'numeric', month: 'long', year: 'numeric' })
                    }
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-base)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="incoming"
                    name="Laporan masuk"
                    stroke="var(--color-brand)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-brand)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    name="Laporan selesai"
                    stroke="var(--color-success)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-success)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">Belum ada data tren mingguan.</p>
          )}
          <div
            className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted"
            aria-label="Legenda grafik"
          >
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-brand" aria-hidden="true" /> Laporan masuk
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" aria-hidden="true" /> Laporan selesai
            </span>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ReportTable
          title="Laporan Berbahaya terlambat"
          description="Laporan dalam rentang yang melewati batas waktu penanganan."
          reports={data.dangerous.lateReports}
          columns={lateColumns}
          empty="Tidak ada laporan Berbahaya yang terlambat."
        />
        <ReportTable
          title="Laporan aktif paling lama"
          description="Daftar ini menampilkan antrean aktif saat ini, di luar rentang tanggal yang dipilih."
          reports={data.oldestActive}
          columns={activeColumns}
          empty="Belum ada laporan aktif."
        />
      </section>

      {Array.isArray(data.handlers) && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Kinerja Penindak</h2>
            <p className="mt-1 text-sm text-text-muted">
              Jumlah aksi Penindak pada rentang {STATS_RANGE_LABELS[data.range].toLocaleLowerCase()}
              .
            </p>
          </div>
          {data.handlers.length ? (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[38rem] text-left text-sm">
                <caption className="sr-only">Kinerja Penindak</caption>
                <thead className="border-b border-border text-xs text-text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Penindak
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Diproses
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Ditandai selesai
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Rata-rata penanganan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.handlers.map((handler) => (
                    <tr key={handler.userId}>
                      <td className="px-3 py-3">
                        <span className="font-medium">{handler.name}</span>
                        <span className="ml-2 text-xs text-text-muted">Penindak</span>
                      </td>
                      <td className="px-3 py-3">{formatNumber(handler.processed)}</td>
                      <td className="px-3 py-3">{formatNumber(handler.resolved)}</td>
                      <td className="px-3 py-3">{formatHours(handler.averageHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <Card className="text-sm text-text-muted">
              Belum ada aktivitas Penindak pada rentang ini.
            </Card>
          )}
        </section>
      )}

      <RatingSummary rating={data.rating} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-text-muted">
          Diperbarui{' '}
          {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(data.generatedAt),
          )}
        </p>
        <ButtonLink
          to={`/api/boards/${encodeURIComponent(slug)}/export?format=csv&range=${encodeURIComponent(data.range)}`}
          variant="secondary"
          reloadDocument
        >
          Ekspor CSV
        </ButtonLink>
      </div>
    </div>
  );
}

export function BoardStatsPage() {
  const { slug } = useParams();
  const [range, setRange] = useState(STATS_DEFAULT_RANGE);
  const statsQuery = useBoardStats(slug, range);

  if (statsQuery.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner label="Memuat statistik Board" />
      </div>
    );
  }

  if (statsQuery.isError && statsQuery.error.status === 403) {
    return (
      <div className="space-y-4" role="status">
        <Badge tone="danger">403</Badge>
        <h1 className="text-2xl font-bold">Akses ditolak</h1>
        <Alert>Kamu hanya dapat melihat Dashboard jika menjadi Penindak di Board ini.</Alert>
        <ButtonLink to={`/b/${slug}`} variant="secondary">
          Kembali ke Board
        </ButtonLink>
      </div>
    );
  }

  if (statsQuery.isError) {
    return (
      <div className="space-y-3">
        <Alert>{statsQuery.error.message}</Alert>
        <Button variant="secondary" onClick={() => statsQuery.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  const data = statsQuery.data.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to={`/b/${slug}`} className="text-sm text-brand hover:underline">
            Kembali ke Board
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Dashboard Statistik</h1>
          <p className="mt-1 text-sm text-text-muted">
            Statistik Penindak untuk laporan di Board ini.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Rentang waktu
          <select
            aria-label="Rentang waktu statistik"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="h-10 min-w-48 rounded-base border border-border bg-surface px-3"
          >
            {Object.keys(STATS_RANGES).map((value) => (
              <option key={value} value={value}>
                {STATS_RANGE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <StatsContent data={data} slug={slug} />
    </div>
  );
}
