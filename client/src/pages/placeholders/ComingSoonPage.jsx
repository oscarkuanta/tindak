import { Card } from '../../components/ui/index.js';

export function ComingSoonPage({ title = 'Segera hadir' }) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <p className="text-sm text-text-muted">Fitur ini akan tersedia di fase berikutnya.</p>
      </Card>
    </section>
  );
}
