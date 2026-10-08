import { Card } from '../../components/ui/index.js';
import { Link, useLocation } from 'react-router';
import { useMe } from '../../features/auth/hooks.js';
import { useBoardSearch, useMyFollows } from '../../features/boards/hooks.js';
import { useMyCity } from '../../features/location/myCity.js';
import { usePopularBoards } from '../../features/feed/hooks.js';
import { VerificationBadge } from '../../components/boards/BoardBadges.jsx';

function PopularBoards() {
  const { city } = useMyCity();
  const popularQuery = usePopularBoards();
  const cityQuery = useBoardSearch(
    { q: '', city, page: 1, pageSize: 6 },
    { enabled: Boolean(city) },
  );
  const cityBoards = cityQuery.data?.data ?? [];
  const showCity = Boolean(city) && cityBoards.length > 0;
  const query = showCity ? cityQuery : popularQuery;
  const boards = showCity ? cityBoards : (popularQuery.data?.data ?? []);
  if (query.isPending || !boards.length) return null;
  return (
    <Card>
      <h2 className="font-heading text-base font-bold">
        {showCity ? `Board Populer di ${city}` : 'Board Populer'}
      </h2>
      <ul className="mt-3 divide-y divide-border">
        {boards.map((board) => (
          <li key={board.id} className="py-3 first:pt-0 last:pb-0">
            <Link to={`/b/${board.slug}`} className="group block">
              <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold group-hover:text-mint-700">
                {board.name}
                <VerificationBadge verification={board.verification} size="sm" />
              </span>
              <span className="mt-1 block text-xs text-text-muted">
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

export function RightSidebar() {
  const location = useLocation();
  const { data: user, isPending: userPending } = useMe();
  const followsQuery = useMyFollows({ enabled: location.pathname === '/' && Boolean(user) });
  const showPopular =
    location.pathname === '/' &&
    !userPending &&
    (!user || (!followsQuery.isPending && (followsQuery.data?.data ?? []).length === 0));

  return (
    <div className="flex flex-col gap-4">
      {showPopular && <PopularBoards />}
      <Card>
        <h2 className="text-sm font-semibold">Tentang T!indak</h2>
        <p className="mt-2 text-sm text-text-muted">
          Laporkan masalah fisik di sekitarmu: jalan rusak, sampah, fasilitas rusak. Komunitas
          mendukung, Penindak menindaklanjuti.
        </p>
      </Card>
    </div>
  );
}
