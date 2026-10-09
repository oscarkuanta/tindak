import { Crown, ShieldCheck } from '@phosphor-icons/react';

export function RoleChip({ role }) {
  if (role !== 'OWNER' && role !== 'HANDLER') return null;
  const isOwner = role === 'OWNER';
  const Icon = isOwner ? Crown : ShieldCheck;
  return (
    <span
      className={`role-chip ${isOwner ? 'role-chip--owner' : 'role-chip--handler'}`}
      aria-label={`Kamu ${isOwner ? 'Penindak Utama' : 'Penindak'} Board ini`}
    >
      <Icon size={14} weight="fill" aria-hidden="true" />
      {isOwner ? 'Penindak Utama' : 'Penindak'}
    </span>
  );
}
