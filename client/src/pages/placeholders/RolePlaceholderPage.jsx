import { Link } from 'react-router';
import { Card } from '../../components/ui/index.js';
import { useMe } from '../../features/auth/hooks.js';

export function RolePlaceholderPage({ title, requiredRole }) {
  const { data: user } = useMe();
  if (user?.role !== requiredRole) {
    return (
      <section className="mx-auto max-w-2xl rounded-card border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-bold">403 · Akses ditolak</h1>
        <p className="mt-2 text-sm text-text-muted">Halaman ini tidak tersedia untuk akun kamu.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Kembali ke Beranda
        </Link>
      </section>
    );
  }
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <p className="text-sm text-text-muted">Segera hadir.</p>
      </Card>
    </section>
  );
}
