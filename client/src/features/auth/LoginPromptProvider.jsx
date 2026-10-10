import { useCallback, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { AUTH_PATHS } from '@tindak/shared';
import { Button, Modal } from '../../components/ui/index.js';
import { GoogleButton } from './GoogleButton.jsx';
import { LoginPromptContext } from './loginPromptContext.js';
import { AccountSync } from './AccountSync.jsx';
import { loginPath } from './returnTo.js';

const DEFAULT_TITLE = 'Masuk untuk melanjutkan';

export function LoginPromptProvider({ children }) {
  const [prompt, setPrompt] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const close = useCallback(() => setPrompt(null), []);

  const openLoginPrompt = useCallback((options = {}) => {
    setPrompt({ title: options.title ?? DEFAULT_TITLE, returnTo: options.returnTo });
  }, []);

  const value = useMemo(
    () => ({ openLoginPrompt, closeLoginPrompt: close }),
    [openLoginPrompt, close],
  );
  const returnTo = prompt?.returnTo ?? location.pathname + location.search;

  function goToEmailLogin() {
    close();
    navigate(loginPath(returnTo));
  }

  return (
    <LoginPromptContext.Provider value={value}>
      <AccountSync />
      {children ?? <Outlet />}
      <Modal open={Boolean(prompt)} onClose={close} title={prompt?.title}>
        <p className="text-sm text-text-muted">
          Gratis dan cepat. Pilih cara masuk yang kamu suka.
        </p>
        <div className="flex flex-col gap-3">
          <GoogleButton returnTo={returnTo} />
          <Button variant="primary" size="lg" block onClick={goToEmailLogin}>
            Masuk dengan email
          </Button>
        </div>
        <p className="text-center text-sm text-text-muted">
          Belum punya akun?{' '}
          <Link
            to={`${AUTH_PATHS.REGISTER}?returnTo=${encodeURIComponent(returnTo)}`}
            onClick={close}
            className="font-semibold text-brand hover:underline"
          >
            Daftar
          </Link>
        </p>
      </Modal>
    </LoginPromptContext.Provider>
  );
}
