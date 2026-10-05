import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Alert, Button, Card } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { normalizeTrackingCode } from '../../features/reports/trackingStorage.js';

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.position = 'absolute';
  field.style.left = '-9999px';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  return copied;
}

export function ReportSuccessPage() {
  const { state } = useLocation();
  const [copyStatus, setCopyStatus] = useState('');
  const trackingCode = state?.trackingCode;
  const trackingUrl = state?.trackingUrl;

  if (!trackingCode) {
    return (
      <EmptyState
        title="Kode Lacak tidak tersedia"
        description="Halaman ini dibuka tanpa hasil pengiriman laporan."
        action={
          <Link to="/lapor" className="font-semibold text-brand">
            Buat laporan
          </Link>
        }
      />
    );
  }

  const codeForPath = normalizeTrackingCode(trackingCode);
  const trackPath = `/lacak/${encodeURIComponent(codeForPath)}${state.secret ? `?secret=${encodeURIComponent(state.secret)}` : ''}`;
  const linkToCopy = trackingUrl || new URL(trackPath, window.location.origin).toString();

  async function copy(value, label) {
    try {
      setCopyStatus(
        (await copyText(value))
          ? `${label} berhasil disalin.`
          : 'Tidak dapat menyalin. Silakan salin secara manual.',
      );
    } catch {
      setCopyStatus('Tidak dapat menyalin. Silakan salin secara manual.');
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <Card className="text-center">
        <p className="text-sm font-semibold text-success">Laporan berhasil dikirim</p>
        <h1 className="mt-2 text-2xl font-bold">Simpan Kode Lacak</h1>
        {state.reportTitle && <p className="mt-2 text-sm text-text-muted">{state.reportTitle}</p>}
        <div className="my-6 rounded-card border border-brand/20 bg-brand-soft px-4 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Kode Lacak
          </p>
          <p className="mt-2 break-all font-mono text-3xl font-bold tracking-widest text-brand sm:text-4xl">
            {trackingCode}
          </p>
        </div>
        <Alert>
          Catat dan simpan kode atau tautan rahasia ini. Kode dibutuhkan untuk memantau laporan.
        </Alert>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={() => copy(trackingCode, 'Kode')}>Salin Kode</Button>
          <Button variant="secondary" onClick={() => copy(linkToCopy, 'Tautan')}>
            Salin Link
          </Button>
          <Link
            to={trackPath}
            className="inline-flex h-10 items-center justify-center rounded-base border border-border px-4 text-sm font-semibold hover:bg-surface-muted"
          >
            Lacak Laporan
          </Link>
        </div>
        {copyStatus && (
          <p role="status" className="mt-3 text-sm text-text-muted">
            {copyStatus}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm">
          <Link to="/laporan-perangkat-ini" className="font-semibold text-brand">
            Laporan di Perangkat Ini
          </Link>
          {state.reportId && (
            <Link to={`/laporan/${state.reportId}`} className="font-semibold text-brand">
              Lihat detail laporan
            </Link>
          )}
        </div>
      </Card>
    </section>
  );
}
