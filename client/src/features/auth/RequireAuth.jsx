import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { LockSimple } from '@phosphor-icons/react';
import { AUTH_PATHS } from '@tindak/shared';
import { ButtonLink, Card, Spinner } from '../../components/ui/index.js';
import { useMe } from './hooks.js';
import { useLoginPrompt } from './loginPromptContext.js';
import { loginPath } from './returnTo.js';

const PAGE_TITLES = [
  ['/board-diikuti', 'Masuk untuk melihat Board yang kamu ikuti'],
  ['/board-saya', 'Masuk untuk melihat Board yang kamu kelola'],
  ['/buat-board', 'Masuk untuk membuat Board'],
  ['/laporan-saya', 'Masuk untuk melihat laporanmu'],
  ['/notifikasi', 'Masuk untuk melihat notifikasi'],
  ['/undangan', 'Masuk untuk melihat undangan Penindak'],
  ['/profil', 'Masuk untuk membuka profil'],
];

function loginTitleFor(pathname) {
  const match = PAGE_TITLES.find(([path]) => pathname.startsWith(path));
  return match?.[1] ?? 'Masuk untuk membuka halaman ini';
}

function LoginRequired({ returnTo, title }) {
  const { openLoginPrompt } = useLoginPrompt();

  useEffect(() => {
    openLoginPrompt({ title, returnTo });
  }, [openLoginPrompt, title, returnTo]);

  return (
    <Card className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
        <LockSimple size={28} weight="fill" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-text-muted">
        Halaman ini khusus untuk akun T!ndak. Masuk atau daftar dulu, gratis dan cepat.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <ButtonLink to={loginPath(returnTo)}>Masuk</ButtonLink>
        <ButtonLink
          to={`${AUTH_PATHS.REGISTER}?returnTo=${encodeURIComponent(returnTo)}`}
          variant="secondary"
        >
          Daftar
        </ButtonLink>
      </div>
    </Card>
  );
}

export function RequireAuth({ children }) {
  const { data: user, isPending } = useMe();
  const location = useLocation();

  if (isPending) return <Spinner />;
  if (!user) {
    return (
      <LoginRequired
        returnTo={location.pathname + location.search}
        title={loginTitleFor(location.pathname)}
      />
    );
  }
  return children ?? <Outlet />;
}
