import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { createReportSchema } from '@tindak/shared';
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Textarea,
} from '../../components/ui/index.js';
import { PhotoUploader } from '../../components/reports/PhotoUploader.jsx';
import { SeveritySelector } from '../../components/reports/SeveritySelector.jsx';
import { TurnstileWidget } from '../../components/reports/TurnstileWidget.jsx';
import { useMe } from '../../features/auth/hooks.js';
import { useBoard } from '../../features/boards/hooks.js';
import { useCreateBoardReport } from '../../features/reports/hooks.js';
import {
  getSecretFromTrackingUrl,
  saveTrackedReport,
} from '../../features/reports/trackingStorage.js';

const INITIAL_VALUES = {
  title: '',
  categoryId: '',
  severity: '',
  locationDetail: '',
  description: '',
  isAnonymous: false,
};

export function ReportFormPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const meQuery = useMe();
  const user = meQuery.data;
  const boardQuery = useBoard(slug);
  const createReport = useCreateBoardReport();
  const board = boardQuery.data?.data;
  const [values, setValues] = useState(INITIAL_VALUES);
  const [photos, setPhotos] = useState([]);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [photoError, setPhotoError] = useState('');
  const [formError, setFormError] = useState('');

  function updateValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  }

  async function submitReport(event) {
    event.preventDefault();
    setFormError('');
    setPhotoError('');

    const result = createReportSchema.safeParse({
      ...values,
      categoryId: values.categoryId || board?.categories?.[0]?.id || '',
      isAnonymous: user ? values.isAnonymous : true,
      turnstileToken,
    });
    const nextErrors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
    }
    if (photos.length < 1) setPhotoError('Unggah minimal 1 foto masalah.');
    if (Object.keys(nextErrors).length || photos.length < 1) {
      setFieldErrors(nextErrors);
      return;
    }
    if (board?.status === 'FROZEN' || board?.isFrozen) {
      setFormError('Board ini sedang dibekukan dan tidak menerima laporan baru.');
      return;
    }

    try {
      const response = await createReport.mutateAsync({
        slug,
        fields: result.data,
        photos,
      });
      const created = response.data ?? {};
      const report = created.report ?? created;
      const trackingCode = created.trackingCode ?? report.trackingCode ?? '';
      const trackingUrl = created.trackingUrl ?? report.trackingUrl ?? '';
      const secret = getSecretFromTrackingUrl(trackingUrl);
      if (trackingCode) {
        saveTrackedReport({
          trackingCode,
          trackingUrl,
          secret,
          reportId: report.id,
          title: report.title ?? values.title,
        });
      }
      navigate('/laporan-terkirim', {
        state: {
          trackingCode,
          trackingUrl,
          secret,
          reportId: report.id,
          reportTitle: report.title ?? values.title,
        },
      });
    } catch (error) {
      setFormError(error.message || 'Laporan belum berhasil dikirim. Coba lagi.');
    }
  }

  if (boardQuery.isPending || meQuery.isPending) return <Spinner label="Memuat formulir laporan" />;
  if (boardQuery.isError) {
    return (
      <Alert>
        {boardQuery.error.status === 404 ? 'Board tidak ditemukan.' : boardQuery.error.message}{' '}
        <Link to="/cari" className="font-semibold underline">
          Cari Board
        </Link>
      </Alert>
    );
  }

  const inactive = board.isInactive || board.status === 'INACTIVE';
  const frozen = board.status === 'FROZEN' || board.isFrozen;

  return (
    <section className="blobs mx-auto max-w-3xl">
      <header className="mb-5">
        <p className="text-sm font-semibold text-brand">Laporan untuk {board.name}</p>
        <h1 className="mt-1 text-2xl font-bold">Laporkan Masalah</h1>
      </header>
      {inactive && (
        <Alert className="mb-4">
          Board ini berstatus Tidak Aktif. Kamu tetap dapat mengirim laporan, tetapi mungkin tidak
          segera ditangani.
        </Alert>
      )}
      {frozen && (
        <Alert className="mb-4">Board ini sedang dibekukan dan tidak menerima laporan baru.</Alert>
      )}
      <Alert className="mb-4">Jangan menyebut nama orang. Laporkan masalah fisik saja.</Alert>
      <Card>
        <form onSubmit={submitReport} className="flex flex-col gap-5" noValidate>
          <Input
            label="Judul laporan"
            maxLength={100}
            value={values.title}
            onChange={(event) => updateValue('title', event.target.value)}
            error={fieldErrors.title}
          />
          <Select
            label="Kategori"
            aria-label="Kategori"
            value={values.categoryId || String(board.categories?.[0]?.id ?? '')}
            onChange={(event) => updateValue('categoryId', event.target.value)}
            error={fieldErrors.categoryId}
          >
            <option value="">Pilih kategori</option>
            {(board.categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <SeveritySelector
            value={values.severity}
            onChange={(value) => updateValue('severity', value)}
            error={fieldErrors.severity}
          />
          <Input
            label="Detail lokasi"
            placeholder="Contoh: Depan minimarket atau Gedung B lantai 2"
            value={values.locationDetail}
            onChange={(event) => updateValue('locationDetail', event.target.value)}
            error={fieldErrors.locationDetail}
          />
          <div className="flex flex-col gap-1.5">
            <Textarea
              label="Deskripsi masalah"
              value={values.description}
              onChange={(event) => updateValue('description', event.target.value)}
              rows={5}
              error={fieldErrors.description}
            />
            <span className="text-xs text-text-muted">
              Minimal 20 karakter · {values.description.length} karakter
            </span>
          </div>
          <PhotoUploader files={photos} onChange={setPhotos} error={photoError} />
          {user ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.isAnonymous}
                onChange={(event) => updateValue('isAnonymous', event.target.checked)}
                className="size-4 accent-brand"
              />
              Kirim sebagai Anonim
            </label>
          ) : (
            <p className="text-sm text-text-muted">Laporan tamu dikirim secara anonim.</p>
          )}
          <TurnstileWidget onToken={setTurnstileToken} error={fieldErrors.turnstileToken} />
          {formError && <Alert>{formError}</Alert>}
          <Button type="submit" loading={createReport.isPending} disabled={frozen} block>
            Kirim Laporan
          </Button>
        </form>
      </Card>
    </section>
  );
}
