import { Avatar, Card } from '../../components/ui/index.js';
import { useMe } from '../../features/auth/hooks.js';

export function ProfilePage() {
  const { data: user } = useMe();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Profil</h1>
      <Card className="flex items-center gap-4">
        <Avatar name={user.name} src={user.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-text-muted">{user.email}</p>
        </div>
      </Card>
      <Card className="text-sm text-text-muted">Pengaturan profil akan tersedia segera.</Card>
    </section>
  );
}
