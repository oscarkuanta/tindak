import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AUTH_PATHS, ERROR_CODES, GOOGLE_LOGIN_ERRORS, loginSchema } from '@tindak/shared';
import { Alert, Button, Input } from '../../components/ui/index.js';
import { useLogin } from '../../features/auth/hooks.js';
import { GoogleButton } from '../../features/auth/GoogleButton.jsx';
import { AuthDivider } from '../../features/auth/AuthDivider.jsx';
import { safeReturnTo } from '../../features/auth/returnTo.js';
import { apiErrorMessage, apiFieldErrors, zodFieldErrors } from '../../features/auth/formErrors.js';

const GOOGLE_ERROR_MESSAGES = {
  [GOOGLE_LOGIN_ERRORS.FAILED]: 'Login Google gagal atau dibatalkan.',
  [GOOGLE_LOGIN_ERRORS.UNAVAILABLE]:
    'Login Google belum tersedia saat ini. Silakan masuk dengan email.',
  [GOOGLE_LOGIN_ERRORS.BANNED]:
    'Akun ini sedang diblokir karena melanggar aturan komunitas. Masuk dengan email untuk melihat sisa waktunya.',
};

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const googleError = GOOGLE_ERROR_MESSAGES[searchParams.get('error')];

  const [values, setValues] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [needsGoogle, setNeedsGoogle] = useState(false);
  const loginMutation = useLogin();

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setNeedsGoogle(false);

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    try {
      await loginMutation.mutateAsync(parsed.data);
    } catch (error) {
      setFieldErrors(apiFieldErrors(error));
      setFormError(apiErrorMessage(error));
      setNeedsGoogle(error?.code === ERROR_CODES.USE_GOOGLE_LOGIN);
    }
  }

  const registerLink =
    returnTo === '/'
      ? AUTH_PATHS.REGISTER
      : `${AUTH_PATHS.REGISTER}?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Masuk</h1>
        <p className="mt-1 text-sm text-text-muted">Pantau dan dukung laporan di sekitarmu.</p>
      </div>

      {googleError && <Alert>{googleError}</Alert>}

      <GoogleButton returnTo={returnTo} highlighted={needsGoogle} />

      <AuthDivider />

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        <Button type="submit" size="lg" block loading={loginMutation.isPending}>
          Masuk
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Belum punya akun?{' '}
        <Link to={registerLink} className="font-semibold text-brand hover:underline">
          Daftar
        </Link>
      </p>
    </div>
  );
}
