import { Link } from 'react-router';
import { Card } from '../../components/ui/index.js';

export function NotFoundPage() {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-5xl font-extrabold text-brand">404</p>
      <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-sm text-text-muted">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-base bg-brand px-4 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-hover"
      >
        Kembali ke Beranda
      </Link>
    </Card>
  );
}
