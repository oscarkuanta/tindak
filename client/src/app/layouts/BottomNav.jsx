import {
  BookmarkSimple,
  House,
  MagnifyingGlass,
  Megaphone,
  UserCircle,
} from '@phosphor-icons/react';
import { Link, NavLink, useLocation } from 'react-router';
import { useMe } from '../../features/auth/hooks.js';

export function BottomNav() {
  const { data: user } = useMe();
  const location = useLocation();
  const boardMatch = location.pathname.match(/^\/b\/([^/]+)/);
  const reportPath = boardMatch ? `/b/${boardMatch[1]}/lapor` : '/lapor';
  const finalItem = user
    ? { to: '/profil', label: 'Profil', icon: UserCircle }
    : { to: '/masuk', label: 'Masuk', icon: UserCircle };

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi bawah">
      <NavLink to="/" end>
        <House size={21} weight="bold" aria-hidden="true" />
        Beranda
      </NavLink>
      <NavLink to="/cari">
        <MagnifyingGlass size={21} weight="bold" aria-hidden="true" />
        Cari
      </NavLink>
      <Link to={reportPath} aria-label="Buat laporan" className="mobile-bottom-nav__action--center">
        <Megaphone size={25} weight="fill" aria-hidden="true" />
      </Link>
      <NavLink to="/board-diikuti">
        <BookmarkSimple size={21} weight="bold" aria-hidden="true" />
        Diikuti
      </NavLink>
      <NavLink to={finalItem.to}>
        <finalItem.icon size={21} weight="bold" aria-hidden="true" />
        {finalItem.label}
      </NavLink>
    </nav>
  );
}
