import { Bookmark, Home, Plus, Search, UserRound } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router';
import { useMe } from '../../features/auth/hooks.js';

export function BottomNav() {
  const { data: user } = useMe();
  const location = useLocation();
  const boardMatch = location.pathname.match(/^\/b\/([^/]+)/);
  const reportPath = boardMatch ? `/b/${boardMatch[1]}/lapor` : '/lapor';
  const finalItem = user
    ? { to: '/profil', label: 'Profil', icon: UserRound }
    : { to: '/masuk', label: 'Masuk', icon: UserRound };

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi bawah">
      <NavLink to="/" end>
        <Home size={19} aria-hidden="true" />
        Beranda
      </NavLink>
      <NavLink to="/cari">
        <Search size={19} aria-hidden="true" />
        Cari
      </NavLink>
      <Link to={reportPath} aria-label="Buat laporan" className="mobile-bottom-nav__action--center">
        <Plus size={25} strokeWidth={2.6} aria-hidden="true" />
      </Link>
      <NavLink to="/board-diikuti">
        <Bookmark size={19} aria-hidden="true" />
        Diikuti
      </NavLink>
      <NavLink to={finalItem.to}>
        <finalItem.icon size={19} aria-hidden="true" />
        {finalItem.label}
      </NavLink>
    </nav>
  );
}
