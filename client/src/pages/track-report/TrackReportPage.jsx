import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Alert, Button, Card, Input, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { ReportDetailContent } from '../../components/reports/ReportDetailContent.jsx';
import { useTrackedReport } from '../../features/handling/hooks.js';
import {
  findTrackedReport,
  getSecretFromTrackingUrl,
  normalizeTrackingCode,
} from '../../features/reports/trackingStorage.js';

const TRACKING_CODE_PATTERN = /^[A-HJ-KM-NP-Z2-9]{8}$/;

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

function savedSecretFor(code) {
  if (!code) return '';
  const saved = findTrackedReport(code);
  return saved?.secret || getSecretFromTrackingUrl(saved?.trackingUrl) || '';
}

export function TrackReportPage() {
  const { code: routeCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [codeInput, setCodeInput] = useState(routeCode ?? '');
  const [secretInput, setSecretInput] = useState(searchParams.get('secret') ?? '');
  const [formError, setFormError] = useState('');
  const code = routeCode ? normalizeTrackingCode(routeCode) : '';
  const secret = searchParams.get('secret') || savedSecretFor(code);
  const query = useTrackedReport(code, secret);

  function submit(event) {
    event.preventDefault();
    const pasted = getPastedCredentials(codeInput.trim());
    const nextCode = normalizeTrackingCode(pasted?.code ?? codeInput);
    if (!TRACKING_CODE_PATTERN.test(nextCode)) {
      setFormError('Kode Lacak harus terdiri dari 8 karakter yang tertera pada laporan.');
      return;
    }
    const nextSecret =
      getSecretFromTrackingUrl(secretInput.trim()) ||
      secretInput.trim() ||
      pasted?.secret ||
      savedSecretFor(nextCode);
    if (!nextSecret) {
      setFormError(
        'Kode ini belum tersimpan di perangkat ini. Tempel tautan rahasia laporan atau isi rahasia tautan lacak.',
      );
      return;
    }
    setFormError('');
    navigate(`/lacak/${encodeURIComponent(nextCode)}?secret=${encodeURIComponent(nextSecret)}`);
  }

  if (!code || !secret) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div>
          <p className="text-sm font-semibold text-brand">Pantau perkembangan masalah</p>
          <h1 className="mt-1 text-2xl font-bold">Lacak Laporan</h1>
          <p className="mt-2 text-sm text-text-muted">
            Di HP atau browser yang dipakai saat melapor, cukup ketik Kode Lacak. Di perangkat lain,
            tempel tautan lengkap yang kamu salin dari halaman Laporan berhasil dikirim.
          </p>
        </div>
        <Card>
          <form className="space-y-4" onSubmit={submit}>
            <Input
              label="Kode Lacak atau tautan lengkap"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="Contoh: K7M2P9QX"
              autoComplete="off"
              required
            />
            <Input
              label="Rahasia tautan lacak"
              value={secretInput}
              onChange={(event) => setSecretInput(event.target.value)}
              hint="Tidak perlu diisi jika laporan dibuat dari perangkat ini."
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
        <p className="text-center text-sm">
          <Link to="/laporan-perangkat-ini" className="font-semibold text-brand hover:underline">
            Lihat laporan tersimpan di perangkat ini
          </Link>
        </p>
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
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/lacak')}>
              Coba lagi
            </Button>
            <Link to="/laporan-perangkat-ini" className="text-sm font-semibold text-brand">
              Lihat kode tersimpan di perangkat ini
            </Link>
          </div>
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
      credentials={{ trackingCode: code, secret }}
    />
  );
}
