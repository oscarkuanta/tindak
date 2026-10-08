import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { registerSchema, z } from '@tindak/shared';
import { Alert, Button, Input, PasswordInput } from '../../components/ui/index.js';
import { useRegister } from '../../features/auth/hooks.js';
import { GoogleButton } from '../../features/auth/GoogleButton.jsx';
import { AuthDivider } from '../../features/auth/AuthDivider.jsx';
import { PasswordChecklist } from '../../features/auth/PasswordChecklist.jsx';
import { loginPath, safeReturnTo } from '../../features/auth/returnTo.js';
import { apiErrorMessage, apiFieldErrors, zodFieldErrors } from '../../features/auth/formErrors.js';

const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi') })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi password tidak sama',
  });

const EMPTY = { name: '', email: '', password: '', confirmPassword: '' };

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));

  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const registerMutation = useRegister();

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const parsed = registerFormSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    const { name, email, password } = parsed.data;
    try {
      await registerMutation.mutateAsync({ name, email, password });
    } catch (error) {
      setFieldErrors(apiFieldErrors(error));
      setFormError(apiErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Daftar</h1>
        <p className="mt-1 text-sm text-text-muted">
          Buat akun untuk mendukung laporan dan mengikuti board.
        </p>
      </div>

      <GoogleButton returnTo={returnTo} label="Daftar dengan Google" />

      <AuthDivider />

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <Input
          label="Nama"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={handleChange}
          error={fieldErrors.name}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            error={fieldErrors.password}
            aria-describedby="password-rules"
          />
          <PasswordChecklist id="password-rules" value={values.password} />
        </div>
        <PasswordInput
          label="Konfirmasi password"
          name="confirmPassword"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange}
          error={fieldErrors.confirmPassword}
        />
        <Button type="submit" size="lg" block loading={registerMutation.isPending}>
          Daftar
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Sudah punya akun?{' '}
        <Link to={loginPath(returnTo)} className="font-semibold text-brand hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
