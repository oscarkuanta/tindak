import { ApiError } from '../../lib/api.js';

export function zodFieldErrors(zodError) {
  const errors = {};
  for (const issue of zodError.issues) {
    const field = issue.path.join('.');
    errors[field] ??= issue.message;
  }
  return errors;
}

export function apiFieldErrors(error) {
  const errors = {};
  if (!(error instanceof ApiError)) return errors;
  for (const detail of error.details ?? []) {
    if (detail?.field) errors[detail.field] ??= detail.message;
  }
  return errors;
}

export function apiErrorMessage(error) {
  if (error instanceof ApiError) return error.message;
  return 'Terjadi kesalahan, coba lagi nanti.';
}
