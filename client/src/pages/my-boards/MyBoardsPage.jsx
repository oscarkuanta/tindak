import { Card } from '../../components/ui/index.js';

export function MyBoardsPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Board Saya</h1>
      <Card className="text-sm text-text-muted">
        Board yang kamu kelola sebagai Penindak akan tampil di sini.
      </Card>
    </section>
  );
}
