import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Alert, Button, Card, Input, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { ReportDetailContent } from '../../components/reports/ReportDetailContent.jsx';
import { useTrackedReport } from '../../features/handling/hooks.js';

function getPastedCredentials(value) {
  try {
    const url = new URL(value);
    const code = url.pathname.match(/\/lacak\/([^/]+)/)?.[1];
    if (code)
      return { code: decodeURIComponent(code), secret: url.searchParams.get('secret') ?? '' };
  } catch {
    return null;
  }
  return null;
}

export function TrackReportPage() {
  const { code: routeCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [codeInput, setCodeInput] = useState(routeCode ?? '');
  const [secretInput, setSecretInput] = useState(searchParams.get('secret') ?? '');
  const [formError, setFormError] = useState('');
  const secret = searchParams.get('secret') ?? '';
  const query = useTrackedReport(routeCode, secret);

  function submit(event) {
    event.preventDefault();
    const pasted = getPastedCredentials(codeInput.trim());
    const code = (pasted?.code ?? codeInput).trim().toUpperCase();
    const trackingSecret = secretInput.trim() || pasted?.secret;
    if (!/^[A-HJ-KM-NP-Z2-9]{8}$/.test(code)) {
      setFormError('Kode Lacak harus terdiri dari 8 karakter yang tertera pada laporan.');
      return;
    }
    if (!trackingSecret) {
      setFormError('Masukkan tautan rahasia dari halaman laporan terkirim.');
      return;
    }
    setFormError('');
    navigate(`/lacak/${encodeURIComponent(code)}?secret=${encodeURIComponent(trackingSecret)}`);
  }

  if (!routeCode || !secret) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Lacak Laporan</h1>
          <p className="mt-2 text-sm text-text-muted">
            Gunakan Kode Lacak dan tautan rahasia yang diberikan saat laporan dibuat.
          </p>
        </div>
        <Card>
          <form className="space-y-4" onSubmit={submit}>
            <Input
              label="Kode Lacak atau tautan lengkap"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              autoComplete="off"
              required
            />
            <Input
              label="Rahasia tautan lacak"
              value={secretInput}
              onChange={(event) => setSecretInput(event.target.value)}
              autoComplete="off"
            />
            {formError && (
              <p role="alert" className="text-sm text-danger">
                {formError}
              </p>
            )}
            <Button type="submit" block>
              Lihat status
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner label="Memeriksa Kode Lacak" />
      </div>
    );
  }
  if (query.error?.status === 404 || query.error?.code === 'REPORT_NOT_FOUND') {
    return (
      <EmptyState
        title="Kode Lacak atau tautan tidak ditemukan"
        description="Pastikan kamu menggunakan kode dan tautan rahasia yang benar."
        action={
          <Button variant="secondary" onClick={() => navigate('/lacak')}>
            Coba lagi
          </Button>
        }
      />
    );
  }
  if (query.isError) {
    return <Alert>{query.error.message}</Alert>;
  }

  return (
    <ReportDetailContent
      key={query.data.data.id}
      report={query.data.data}
      credentials={{ trackingCode: routeCode, secret }}
    />
  );
}
