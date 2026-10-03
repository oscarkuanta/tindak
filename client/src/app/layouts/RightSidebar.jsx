import { Card } from '../../components/ui/index.js';

export function RightSidebar() {
  return (
    <div className="sticky top-[calc(var(--spacing-header)+1.5rem)] flex flex-col gap-4">
      <Card>
        <h2 className="text-sm font-semibold">Tentang T!indak</h2>
        <p className="mt-2 text-sm text-text-muted">
          Laporkan masalah fisik di sekitarmu: jalan rusak, sampah, fasilitas rusak. Komunitas
          mendukung, Penindak menindaklanjuti.
        </p>
      </Card>
    </div>
  );
}
