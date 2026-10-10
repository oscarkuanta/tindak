import { Link, useLocation } from 'react-router';
import { MapPin } from '@phosphor-icons/react';
import { Card } from '../../components/ui/index.js';
import { useBoardSearch } from '../../features/boards/hooks.js';
import { useMyCity } from '../../features/location/myCity.js';
import { VerificationBadge } from '../../components/boards/BoardBadges.jsx';

const NEARBY_LIMIT = 6;

function NearbyBoards() {
  const { city } = useMyCity();
  const query = useBoardSearch(
    { q: '', city, page: 1, pageSize: NEARBY_LIMIT },
    { enabled: Boolean(city) },
  );
  const boards = query.data?.data ?? [];

  return (
    <Card>
      <h2 className="flex items-center gap-1.5 font-heading text-base font-bold">
        <MapPin size={18} weight="fill" className="text-brand" aria-hidden="true" />
        Board di Sekitarmu
      </h2>
      {!city ? (
        <p className="mt-2 text-sm text-text-muted">
          Pilih kotamu di Beranda supaya Board terdekat muncul di sini.
        </p>
      ) : query.isPending ? (
        <p className="mt-2 text-sm text-text-muted">Memuat Board di {city}...</p>
      ) : query.isError ? (
        <p className="mt-2 text-sm text-text-muted">Board di {city} belum bisa dimuat.</p>
      ) : boards.length === 0 ? (
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <p className="text-text-muted">Belum ada Board di {city}.</p>
          <Link to="/buat-board" className="font-semibold text-brand hover:underline">
            Jadi yang pertama membuat Board di sini
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-text-muted">{city}</p>
          <ul className="mt-3 divide-y divide-border">
            {boards.map((board) => (
              <li key={board.id} className="py-3 first:pt-0 last:pb-0">
                <Link to={`/b/${board.slug}`} className="group block">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold group-hover:text-mint-700">
                    {board.name}
                    <VerificationBadge verification={board.verification} size="sm" />
                  </span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {board.followerCount} pengikut · {board.activeReportCount} laporan aktif
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to={`/cari?city=${encodeURIComponent(city)}`}
            className="mt-3 block text-sm font-semibold text-brand hover:underline"
          >
            Lihat semua Board di {city}
          </Link>
        </>
      )}
    </Card>
  );
}

export function RightSidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col gap-4">
      {location.pathname === '/' && <NearbyBoards />}
      <Card>
        <h2 className="text-sm font-semibold">Tentang T!ndak</h2>
        <p className="mt-2 text-sm text-text-muted">
          Laporkan masalah fisik di sekitarmu: jalan rusak, sampah, fasilitas rusak. Komunitas
          mendukung, Penindak menindaklanjuti.
        </p>
      </Card>
    </div>
  );
}
