import { Link, Outlet } from 'react-router';
import { Logo } from './Logo.jsx';

export function AuthLayout() {
  return (
    <div className="auth-page blobs flex min-h-screen flex-col">
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Logo className="text-3xl" />
          </div>
          <div className="rounded-panel border border-border bg-surface p-6 shadow-elevated sm:p-8">
            <Outlet />
          </div>
          <p className="mt-6 text-center text-xs text-text-muted">
            <Link to="/" className="hover:text-text">
              Kembali ke Beranda
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
