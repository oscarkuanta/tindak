import {
  ClipboardText,
  EyeSlash,
  FlagBanner,
  Lightning,
  Prohibit,
  SealCheck,
  ShieldWarning,
  Snowflake,
  SquaresFour,
  Trash,
  UsersThree,
  CheckCircle,
} from '@phosphor-icons/react';
import { StatCard } from '../../components/ui/index.js';
import { useAdminStats } from '../../features/moderation/hooks.js';
import { QueryState } from './adminShared.jsx';

function Section({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        <p className="mt-0.5 text-xs text-text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function AdminDashboardPage() {
  const query = useAdminStats();
  return (
    <QueryState query={{ ...query, data: query.data && { data: [query.data.data] } }}>
      {([stats]) => (
        <div className="space-y-7">
          <Section
            title="Perlu ditangani"
            description="Klik kartu untuk langsung membuka menu terkait."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Konten menunggu tinjauan"
                value={stats.moderation.openTargets}
                note={`${stats.moderation.openFlags} tanda pelanggaran terbuka`}
                icon={ShieldWarning}
                tone="red"
                to="/admin/moderasi"
              />
              <StatCard
                label="Ban aktif"
                value={stats.bans.active}
                note="Akun, perangkat, dan IP"
                icon={Prohibit}
                tone="amber"
                to="/admin/ban"
              />
              <StatCard
                label="Board di-freeze"
                value={stats.boards.frozen}
                note={`dari ${stats.boards.total} Board`}
                icon={Snowflake}
                tone="blue"
                to="/admin/board?status=FROZEN"
              />
              <StatCard
                label="Pengguna terdaftar"
                value={stats.users.total}
                note="Kelola dan ban user"
                icon={UsersThree}
                tone="violet"
                to="/admin/user"
              />
              <StatCard
                label="Semua Board"
                value={stats.boards.total}
                note={`${stats.boards.official} Official`}
                icon={SquaresFour}
                tone="mint"
                to="/admin/board"
              />
            </div>
          </Section>

          <Section title="Ringkasan platform" description="Angka informasi, tidak bisa diklik.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total laporan"
                value={stats.reports.total}
                icon={ClipboardText}
                tone="blue"
              />
              <StatCard
                label="Laporan aktif"
                value={stats.reports.active}
                icon={Lightning}
                tone="amber"
              />
              <StatCard
                label="Laporan selesai"
                value={stats.reports.resolved}
                icon={CheckCircle}
                tone="mint"
              />
              <StatCard
                label="Board Official"
                value={stats.boards.official}
                icon={SealCheck}
                tone="blue"
              />
              <StatCard
                label="Tanda pelanggaran terbuka"
                value={stats.moderation.openFlags}
                icon={FlagBanner}
                tone="red"
              />
              <StatCard
                label="Laporan disembunyikan"
                value={stats.reports.hidden}
                icon={EyeSlash}
                tone="slate"
              />
              <StatCard
                label="Laporan dihapus"
                value={stats.reports.removed}
                icon={Trash}
                tone="slate"
              />
            </div>
          </Section>
        </div>
      )}
    </QueryState>
  );
}
