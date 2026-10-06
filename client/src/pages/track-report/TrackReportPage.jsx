import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Alert, Button, Card, Input, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import {
  ReportSeverityBadge,
  ReportStatusBadge,
} from '../../components/reports/ReportStatusBadge.jsx';
import { ReportTimeline } from '../../components/reports/ReportTimeline.jsx';
import { useTrackedReport } from '../../features/reports/hooks.js';
import {
  findTrackedReport,
  getSecretFromTrackingUrl,
  normalizeTrackingCode,
} from '../../features/reports/trackingStorage.js';

export function TrackReportPage() {
  const { code: pathCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [codeInput, setCodeInput] = useState(pathCode ?? '');
  const [secretInput, setSecretInput] = useState('');
  const [formError, setFormError] = useState('');
  const code = normalizeTrackingCode(pathCode ?? '');
  const secret =
    searchParams.get('secret') || (pathCode ? findTrackedReport(pathCode)?.secret : '') || '';
  const query = useTrackedReport(code, secret);
  const data = query.data?.data;
  const report = data?.report ?? data;

  function submit(event) {
    event.preventDefault();
    const nextCode = normalizeTrackingCode(codeInput);
    if (!nextCode) {
      setFormError('Masukkan Kode Lacak.');
      return;
    }
    const saved = findTrackedReport(nextCode);
    const providedSecret = getSecretFromTrackingUrl(secretInput) || secretInput.trim();
    const nextSecret =
      providedSecret || saved?.secret || getSecretFromTrackingUrl(saved?.trackingUrl);
    if (!nextSecret) {
      setFormError(
        'Kode ini belum tersimpan di perangkat. Buka tautan rahasia laporan atau masukkan secret dari tautan tersebut.',
      );
      return;
    }
    setFormError('');
    navigate(`/lacak/${encodeURIComponent(nextCode)}?secret=${encodeURIComponent(nextSecret)}`);
  }

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-5">
        <p className="text-sm font-semibold text-brand">Pantau perkembangan masalah</p>
        <h1 className="mt-1 text-2xl font-bold">Lacak Laporan</h1>
      </header>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label="Kode Lacak"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="Contoh: K7M2P9QX"
              error={formError}
            />
          </div>
          <details className="text-sm sm:pb-2">
            <summary className="cursor-pointer font-medium text-brand">
              Punya tautan rahasia?
            </summary>
            <div className="mt-3 sm:absolute sm:z-10 sm:w-80 sm:rounded-card sm:border sm:border-border sm:bg-surface sm:p-3 sm:shadow-card">
              <Input
                label="Secret atau tautan rahasia"
                value={secretInput}
                onChange={(event) => setSecretInput(event.target.value)}
                hint="Diperlukan jika membuka laporan dari perangkat lain."
              />
            </div>
          </details>
          <Button type="submit">Lacak</Button>
        </form>
        {formError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {formError}
          </p>
        )}
      </Card>

      {pathCode && query.isPending && (
        <div className="mt-5">
          <Spinner label="Memuat laporan" />
        </div>
      )}
      {pathCode && query.isError && (
        <div className="mt-5">
          <EmptyState
            title="Laporan tidak ditemukan"
            description="Kode atau tautan rahasia tidak valid. Pastikan kamu membuka tautan lacak yang benar."
            action={
              <Link to="/laporan-perangkat-ini" className="font-semibold text-brand">
                Lihat kode tersimpan di perangkat ini
              </Link>
            }
          />
        </div>
      )}
      {report && (
        <Card className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <ReportSeverityBadge severity={report.severity} />
            <ReportStatusBadge status={report.status} />
          </div>
          <h2 className="mt-3 text-xl font-bold">{report.title}</h2>
          {report.locationDetail && (
            <p className="mt-1 text-sm text-text-muted">{report.locationDetail}</p>
          )}
          {report.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm">{report.description}</p>
          )}
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="mb-4 font-semibold">Timeline</h3>
            <ReportTimeline report={report} />
          </div>
        </Card>
      )}
      {pathCode && query.isError && (
        <Alert className="sr-only">Kode lacak tidak dapat diverifikasi.</Alert>
      )}
    </section>
  );
}
