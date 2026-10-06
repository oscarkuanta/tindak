import { Link } from 'react-router';
import { Card } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import {
  readTrackedReports,
  normalizeTrackingCode,
} from '../../features/reports/trackingStorage.js';

function trackedPath(entry) {
  const code = normalizeTrackingCode(entry.trackingCode);
  const secret = entry.secret;
  return `/lacak/${encodeURIComponent(code)}${secret ? `?secret=${encodeURIComponent(secret)}` : ''}`;
}

export function DeviceReportsPage() {
  const entries = readTrackedReports();

  if (!entries.length) {
    return (
      <EmptyState
        title="Belum ada laporan tersimpan"
        description="Laporan yang kamu kirim dari perangkat ini akan muncul di sini."
        action={
          <Link to="/lacak" className="font-semibold text-brand">
            Lacak laporan
          </Link>
        }
      />
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-5">
        <p className="text-sm font-semibold text-brand">Tersimpan di browser ini</p>
        <h1 className="mt-1 text-2xl font-bold">Laporan di Perangkat Ini</h1>
      </header>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={`${entry.trackingCode}-${entry.savedAt}`}>
            <Link to={trackedPath(entry)}>
              <Card className="transition hover:border-brand">
                <p className="font-semibold">{entry.title || 'Laporan masalah'}</p>
                <p className="mt-1 font-mono text-sm text-brand">{entry.trackingCode}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
