import { Outlet } from 'react-router';
import { Header } from './Header.jsx';
import { LeftNav } from './LeftNav.jsx';
import { RightSidebar } from './RightSidebar.jsx';

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto flex w-full max-w-layout gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Navigasi utama">
          <LeftNav />
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
        <aside className="hidden w-80 shrink-0 xl:block" aria-label="Informasi samping">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
