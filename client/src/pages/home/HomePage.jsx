import { Card } from '../../components/ui/index.js';

export function HomePage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Beranda</h1>
      <Card className="text-sm text-text-muted">Belum ada laporan untuk ditampilkan.</Card>
    </section>
  );
}
