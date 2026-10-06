import { Link } from 'react-router';
import { Card } from '../../components/ui/index.js';
import { useAdminStats } from '../../features/moderation/hooks.js';
import { QueryState } from './adminShared.jsx';

function Stat({ label, value, to }) {
  const content = (
    <Card className="h-full">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
  return to ? (
    <Link to={to} className="block hover:opacity-90">
      {content}
    </Link>
  ) : (
    content
  );
}

export function AdminDashboardPage() {
  const query = useAdminStats();
  return (
    <QueryState query={{ ...query, data: query.data && { data: [query.data.data] } }}>
      {([stats]) => (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Konten menunggu tinjauan"
            value={stats.moderation.openTargets}
            to="/admin/moderasi"
          />
          <Stat label="Tanda pelanggaran terbuka" value={stats.moderation.openFlags} />
          <Stat label="Ban aktif" value={stats.bans.active} to="/admin/ban" />
          <Stat label="User" value={stats.users.total} to="/admin/user" />
          <Stat label="Board" value={stats.boards.total} to="/admin/board" />
          <Stat label="Board Official" value={stats.boards.official} />
          <Stat label="Board dibekukan" value={stats.boards.frozen} />
          <Stat label="Laporan" value={stats.reports.total} />
          <Stat label="Laporan aktif" value={stats.reports.active} />
          <Stat label="Laporan selesai" value={stats.reports.resolved} />
          <Stat label="Laporan disembunyikan" value={stats.reports.hidden} />
          <Stat label="Laporan dihapus" value={stats.reports.removed} />
        </div>
      )}
    </QueryState>
  );
}
