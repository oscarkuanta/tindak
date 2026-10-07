import { Outlet } from 'react-router';
import { Header } from './Header.jsx';
import { LeftNav } from './LeftNav.jsx';
import { RightSidebar } from './RightSidebar.jsx';
import { BottomNav } from './BottomNav.jsx';

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="app-grid">
        <aside className="app-left-nav" aria-label="Navigasi utama">
          <LeftNav />
        </aside>
        <main className="app-main min-w-0">
          <Outlet />
        </main>
        <aside className="app-right-sidebar min-w-0" aria-label="Informasi samping">
          <RightSidebar />
        </aside>
      </div>
      <BottomNav />
    </div>
  );
}
