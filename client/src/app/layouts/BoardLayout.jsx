import { Outlet } from 'react-router';
import { Header } from './Header.jsx';
import { LeftNav } from './LeftNav.jsx';
import { BottomNav } from './BottomNav.jsx';

export function BoardLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="board-layout-grid">
        <aside className="app-left-nav" aria-label="Navigasi utama">
          <LeftNav />
        </aside>
        <main className="app-main min-w-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
