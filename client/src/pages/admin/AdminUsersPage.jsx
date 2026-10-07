import { useState } from 'react';
import { USER_ROLES, createBanRequestSchema } from '@tindak/shared';
import { Alert, Badge, Button, Card, Input, Modal } from '../../components/ui/index.js';
import { BanFields } from '../../components/moderation/BanFields.jsx';
import { useAdminUsers, useCreateBan } from '../../features/moderation/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { apiErrorMessage } from '../../features/auth/formErrors.js';
import { Pager, QueryState } from './adminShared.jsx';
import { formatDateTime } from './adminFormat.js';

const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.BOARD_ADMIN]: 'Admin Board',
};

function BanUserModal({ user, onClose }) {
  const [ban, setBan] = useState({ targetType: 'USER', duration: '7d', reason: '' });
  const [error, setError] = useState(null);
  const mutation = useCreateBan();
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = createBanRequestSchema.safeParse({ ...ban, userId: user.id });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    try {
      await mutation.mutateAsync(parsed.data);
      showToast(`${user.name} di-ban`);
      onClose();
    } catch (apiError) {
      setError(apiErrorMessage(apiError));
    }
  }

  return (
    <Modal open onClose={onClose} title={`Ban ${user.name}`}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <BanFields value={ban} onChange={setBan} targets={['USER']} />
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="danger" loading={mutation.isPending}>
            Ban
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UserRow({ user }) {
  const [banning, setBanning] = useState(false);
  return (
    <Card className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{user.name}</span>
          {ROLE_LABELS[user.role] && <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>}
          {user.activeBan && (
            <Badge tone="danger">
              Di-ban{' '}
              {user.activeBan.expiresAt
                ? `s.d. ${formatDateTime(user.activeBan.expiresAt)}`
                : 'permanen'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-text-muted">{user.email}</p>
        <p className="text-xs text-text-muted">
          {user.reportCount} laporan · {user.flagCount} tanda · Bergabung{' '}
          {formatDateTime(user.createdAt)}
        </p>
      </div>
      {user.role !== USER_ROLES.ADMIN && !user.activeBan && (
        <Button variant="danger" size="sm" onClick={() => setBanning(true)}>
          Ban
        </Button>
      )}
      {banning && <BanUserModal user={user} onClose={() => setBanning(false)} />}
    </Card>
  );
}

export function AdminUsersPage() {
  const [filters, setFilters] = useState({ q: '', page: 1 });
  const query = useAdminUsers(filters);

  return (
    <div className="flex flex-col gap-4">
      <Input
        aria-label="Cari user"
        placeholder="Cari nama atau email"
        value={filters.q}
        onChange={(event) => setFilters({ q: event.target.value, page: 1 })}
      />
      <QueryState query={query} empty="User tidak ditemukan.">
        {(users, meta) => (
          <>
            <div className="flex flex-col gap-3">
              {users.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </div>
            <Pager
              meta={meta}
              page={filters.page}
              onPage={(page) => setFilters((value) => ({ ...value, page }))}
            />
          </>
        )}
      </QueryState>
    </div>
  );
}
