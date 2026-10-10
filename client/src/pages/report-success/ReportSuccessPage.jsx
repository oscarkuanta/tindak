import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { CheckCircle, Info } from '@phosphor-icons/react';
import { AUTH_PATHS } from '@tindak/shared';
import { Alert, Button, Card } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { normalizeTrackingCode } from '../../features/reports/trackingStorage.js';
import { useMe } from '../../features/auth/hooks.js';

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
  const { data: user } = useMe();
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

  if (user) {
    return (
      <section className="mx-auto max-w-2xl">
        <Card className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
            <CheckCircle size={32} weight="fill" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold">Laporan berhasil dikirim</h1>
          {state.reportTitle && <p className="text-sm text-text-muted">{state.reportTitle}</p>}
          <p className="max-w-md text-sm text-text-muted">
            Laporan ini tersimpan di akunmu. Kamu akan mendapat notifikasi saat Penindak
            menanggapinya, dan bisa memantaunya kapan saja di Laporan Saya.
          </p>
          <p className="text-xs text-text-muted">
            Kode Lacak: <span className="font-mono font-semibold text-text">{trackingCode}</span>
          </p>
          <div className="mt-2 flex flex-col justify-center gap-2 sm:flex-row">
            {state.reportId && (
              <Link
                to={`/laporan/${state.reportId}`}
                className="inline-flex h-10 items-center justify-center rounded-base bg-brand px-4 text-sm font-semibold text-brand-contrast hover:bg-brand-hover"
              >
                Lihat detail laporan
              </Link>
            )}
            <Link
              to="/laporan-saya"
              className="inline-flex h-10 items-center justify-center rounded-base border border-border px-4 text-sm font-semibold hover:bg-surface-muted"
            >
              Buka Laporan Saya
            </Link>
          </div>
        </Card>
      </section>
    );
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
        <div className="flex gap-3 rounded-card border border-blue-200 bg-blue-100 p-4 text-left text-sm text-blue-700">
          <Info size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Kenapa kamu mendapat Kode Lacak?</h2>
            <p className="mt-1">
              Kamu melapor tanpa masuk akun, jadi laporan ini tidak tersimpan di akun mana pun. Kode
              Lacak dan tautan rahasianya adalah satu-satunya cara untuk memantau status, menjawab
              pertanyaan Penindak, dan mengonfirmasi laporan selesai.
            </p>
            <p className="mt-1">
              Kode ini juga disimpan di browser perangkat ini, tetapi bisa hilang jika riwayat
              browser dihapus. Salin dan simpan di tempat aman.
            </p>
          </div>
        </div>
        <Alert tone="warning" className="mt-3">
          Jangan bagikan tautan rahasia ke orang lain. Siapa pun yang memegangnya bisa menanggapi
          laporan ini atas namamu.
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
        <p className="mt-5 text-sm text-text-muted">
          Ingin laporan berikutnya tersimpan otomatis?{' '}
          <Link to={AUTH_PATHS.REGISTER} className="font-semibold text-brand hover:underline">
            Daftar akun gratis
          </Link>
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm">
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
