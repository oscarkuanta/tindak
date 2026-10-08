import { Link } from 'react-router';
import {
  Activity,
  Ban,
  ClipboardCheck,
  Flag,
  FileCheck2,
  FileText,
  LayoutGrid,
  ShieldAlert,
  Users,
  BadgeCheck,
} from 'lucide-react';
import { StatCard } from '../../components/ui/index.js';
import { useAdminStats } from '../../features/moderation/hooks.js';
import { QueryState } from './adminShared.jsx';

function Stat({ label, value, to, icon, tone = 'mint' }) {
  const content = (
    <StatCard className="h-full" label={label} value={value} icon={icon} tone={tone} />
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
            icon={ClipboardCheck}
            tone="cream"
          />
          <Stat
            label="Tanda pelanggaran terbuka"
            value={stats.moderation.openFlags}
            icon={Flag}
            tone="sky"
          />
          <Stat
            label="Ban aktif"
            value={stats.bans.active}
            to="/admin/ban"
            icon={Ban}
            tone="cream"
          />
          <Stat label="User" value={stats.users.total} to="/admin/user" icon={Users} tone="sky" />
          <Stat label="Board" value={stats.boards.total} to="/admin/board" icon={LayoutGrid} />
          <Stat label="Board Official" value={stats.boards.official} icon={BadgeCheck} tone="sky" />
          <Stat
            label="Board dibekukan"
            value={stats.boards.frozen}
            icon={ShieldAlert}
            tone="cream"
          />
          <Stat label="Laporan" value={stats.reports.total} icon={FileText} />
          <Stat label="Laporan aktif" value={stats.reports.active} icon={Activity} tone="sky" />
          <Stat label="Laporan selesai" value={stats.reports.resolved} icon={FileCheck2} />
          <Stat
            label="Laporan disembunyikan"
            value={stats.reports.hidden}
            icon={ShieldAlert}
            tone="cream"
          />
          <Stat label="Laporan dihapus" value={stats.reports.removed} icon={FileText} tone="sky" />
        </div>
      )}
    </QueryState>
  );
}
