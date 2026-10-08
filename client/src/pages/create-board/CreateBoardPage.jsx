import { X } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  BOARD_DEFAULT_CATEGORIES,
  BOARD_TYPE_LABELS,
  DEFAULT_DANGEROUS_TARGET_HOURS,
  boardAboutSchema,
  boardCategorySchema,
  boardIdentitySchema,
  boardSettingsSchema,
  createBoardSchema,
} from '@tindak/shared';
import { Alert, Button, Card, Input } from '../../components/ui/index.js';
import { BoardCard } from '../../components/boards/BoardCard.jsx';
import { CitySelect } from '../../components/boards/CitySelect.jsx';
import { useBoardSimilar, useCreateBoard } from '../../features/boards/hooks.js';
import { useToast } from '../../features/boards/toastContext.js';
import { BoardTypeIcon } from '../../components/icons/AppIcons.jsx';

const STEPS = [
  { name: 'Identitas', schema: boardIdentitySchema },
  { name: 'Tentang Board', schema: boardAboutSchema },
  { name: 'Pengaturan', schema: boardSettingsSchema },
];

const INITIAL_FORM = {
  name: '',
  city: '',
  type: '',
  managerTitle: '',
  description: '',
  extraCategories: [],
  dangerousTargetHours: DEFAULT_DANGEROUS_TARGET_HOURS,
};

function getFieldErrors(error) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path[0] ?? 'form', issue.message]));
}

export function CreateBoardPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [categoryDraft, setCategoryDraft] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [requestError, setRequestError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createMutation = useCreateBoard();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedName(form.name.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [form.name]);

  const similarQuery = useBoardSimilar(
    { name: debouncedName, city: form.city },
    { enabled: step === 0 && debouncedName.length >= 3 && Boolean(form.city) },
  );
  const similarBoards = similarQuery.data?.data ?? [];
  const defaultCategories = useMemo(
    () => (form.type ? BOARD_DEFAULT_CATEGORIES[form.type] : []),
    [form.type],
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    setRequestError('');
  }

  function validateCurrentStep() {
    const result = STEPS[step].schema.safeParse(form);
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return false;
    }
    setErrors({});
    return true;
  }

  function addCategory() {
    const result = boardCategorySchema.safeParse({ name: categoryDraft });
    if (!result.success) {
      setCategoryError(result.error.issues[0].message);
      return;
    }
    const normalized = result.data.name.toLocaleLowerCase('id-ID');
    const existing = [...defaultCategories, ...form.extraCategories].some(
      (name) => name.toLocaleLowerCase('id-ID') === normalized,
    );
    if (existing) {
      setCategoryError('Kategori ini sudah ada.');
      return;
    }
    if (form.extraCategories.length >= 10) {
      setCategoryError('Maksimal 10 kategori tambahan.');
      return;
    }
    setForm((current) => ({
      ...current,
      extraCategories: [...current.extraCategories, result.data.name],
    }));
    setCategoryDraft('');
    setCategoryError('');
  }

  function removeCategory(name) {
    setForm((current) => ({
      ...current,
      extraCategories: current.extraCategories.filter((category) => category !== name),
    }));
  }

  async function submitBoard() {
    const result = createBoardSchema.safeParse({
      ...form,
      managerTitle: form.managerTitle.trim() || undefined,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      setRequestError('Periksa kembali data Board sebelum dibuat.');
      return;
    }

    try {
      const response = await createMutation.mutateAsync(result.data);
      showToast('Board berhasil dibuat');
      navigate(`/b/${response.data.slug}`);
    } catch (error) {
      if (error.code === 'BOARD_LIMIT_REACHED') {
        setRequestError('Kamu sudah mencapai batas 3 Board yang dibuat.');
      } else if (error.code === 'VALIDATION_ERROR') {
        setErrors(
          getFieldErrors({
            issues: (error.details ?? []).map((item) => ({
              path: [item.field],
              message: item.message,
            })),
          }),
        );
        setRequestError(error.message);
      } else {
        setRequestError(error.message || 'Board belum dapat dibuat. Coba lagi.');
      }
    }
  }

  async function handleContinue(event) {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    await submitBoard();
  }

  const hasSummaryError = Boolean(errors.name || errors.city || errors.type || errors.description);

  return (
    <section className="blobs mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="text-sm font-semibold text-brand">Mulai ruang laporan baru</p>
        <h1 className="mt-1 text-2xl font-bold">Buat Board</h1>
        <p className="mt-2 text-sm text-text-muted">
          Isi informasi Board agar warga tahu masalah apa yang bisa dilaporkan di sini.
        </p>
      </header>

      <ol aria-label="Langkah pembuatan Board" className="grid grid-cols-3 gap-2">
        {STEPS.map((item, index) => (
          <li
            key={item.name}
            aria-current={step === index ? 'step' : undefined}
            className={`rounded-base border px-3 py-2 text-center text-xs font-medium sm:text-sm ${step === index ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-surface text-text-muted'}`}
          >
            <span className="mr-1 inline-flex size-5 items-center justify-center rounded-full bg-surface text-xs">
              {index + 1}
            </span>
            {item.name}
          </li>
        ))}
      </ol>

      {requestError && (
        <Alert>
          {requestError}{' '}
          {createMutation.error?.code === 'BOARD_LIMIT_REACHED' && (
            <Link className="font-semibold underline" to="/board-saya">
              Buka Board Saya
            </Link>
          )}
        </Alert>
      )}

      <form onSubmit={handleContinue} noValidate>
        {step === 0 && (
          <Card className="flex flex-col gap-5 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Identitas</h2>
              <p className="mt-1 text-sm text-text-muted">Nama, kota, dan jenis Board.</p>
            </div>
            <Input
              label="Nama Board"
              placeholder="Contoh: Jalan Rungkut Madya"
              value={form.name}
              error={errors.name}
              maxLength={80}
              onChange={(event) => updateField('name', event.target.value)}
            />
            <CitySelect
              value={form.city}
              onChange={(city) => updateField('city', city)}
              error={errors.city}
            />
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Jenis Board</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(BOARD_TYPE_LABELS).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={form.type === type}
                    onClick={() => updateField('type', type)}
                    className={`flex min-h-14 items-center gap-2 rounded-base border px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-brand ${form.type === type ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-surface hover:bg-surface-muted'}`}
                  >
                    <BoardTypeIcon type={type} size={24} className="text-mint-700" />
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </div>
              {errors.type && <p className="text-xs text-danger">{errors.type}</p>}
            </fieldset>

            {debouncedName.length >= 3 && form.city && similarBoards.length > 0 && (
              <div className="rounded-base border border-warning/40 bg-warning/10 p-4">
                <h3 className="font-semibold">Board serupa sudah ada</h3>
                <p className="mb-3 mt-1 text-sm text-text-muted">
                  Periksa Board berikut sebelum melanjutkan. Kamu tetap boleh membuat Board baru.
                </p>
                <div className="flex flex-col gap-2">
                  {similarBoards.map((board) => (
                    <BoardCard key={board.id} board={board} compact />
                  ))}
                </div>
              </div>
            )}
            {similarQuery.isError && (
              <p className="text-xs text-text-muted" role="status">
                Pencarian Board serupa belum tersedia. Kamu tetap bisa lanjut.
              </p>
            )}
          </Card>
        )}

        {step === 1 && (
          <Card className="flex flex-col gap-5 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Tentang Board</h2>
              <p className="mt-1 text-sm text-text-muted">
                Jelaskan siapa yang mengelola dan area cakupannya.
              </p>
            </div>
            <Input
              label="Jabatan pengelola (opsional)"
              hint="Hanya informasi, contoh: Ketua RT 05."
              placeholder="Contoh: Wakasek Sarpras"
              value={form.managerTitle}
              error={errors.managerTitle}
              maxLength={80}
              onChange={(event) => updateField('managerTitle', event.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="board-description" className="text-sm font-medium">
                Deskripsi dan cakupan
              </label>
              <textarea
                id="board-description"
                rows={6}
                maxLength={1000}
                value={form.description}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={
                  errors.description ? 'board-description-error' : 'board-description-count'
                }
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Jelaskan masalah yang bisa dilaporkan dan wilayah yang dicakup Board ini."
                className={`w-full rounded-base border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${errors.description ? 'border-danger' : 'border-border'}`}
              />
              <div className="flex justify-between text-xs text-text-muted">
                {errors.description ? (
                  <span id="board-description-error" className="text-danger">
                    {errors.description}
                  </span>
                ) : (
                  <span id="board-description-count">Minimal 20 karakter.</span>
                )}
                <span>{form.description.length}/1000</span>
              </div>
            </div>
            <Alert tone="info">
              Board baru berstatus Komunitas. Status Official diberikan Admin Board setelah Board
              mendapat banyak rating dan dipercaya pengguna.
            </Alert>
          </Card>
        )}

        {step === 2 && (
          <Card className="flex flex-col gap-5 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Pengaturan</h2>
              <p className="mt-1 text-sm text-text-muted">
                Kategori awal dan target penanganan laporan Berbahaya.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium">
                Kategori bawaan · {BOARD_TYPE_LABELS[form.type]}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {defaultCategories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-text-muted"
                  >
                    {category}
                  </span>
                ))}
                {form.extraCategories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs text-brand"
                  >
                    {category}
                    <button
                      type="button"
                      aria-label={`Hapus ${category}`}
                      onClick={() => removeCategory(category)}
                      className="grid place-items-center"
                    >
                      <X aria-hidden="true" size={12} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  label="Tambah kategori"
                  className="sm:max-w-md"
                  value={categoryDraft}
                  error={categoryError || errors.extraCategories}
                  placeholder="Contoh: Parkir liar"
                  onChange={(event) => {
                    setCategoryDraft(event.target.value);
                    setCategoryError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addCategory();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="self-end"
                  onClick={addCategory}
                >
                  Tambah
                </Button>
              </div>
              <p className="mt-1 text-xs text-text-muted">Maksimal 10 kategori tambahan.</p>
            </div>
            <Input
              label="Target jam laporan Berbahaya"
              type="number"
              min={1}
              max={720}
              value={form.dangerousTargetHours}
              error={errors.dangerousTargetHours}
              hint="Default 48 jam. Bisa diubah nanti di Pengaturan Board."
              onChange={(event) => updateField('dangerousTargetHours', event.target.value)}
            />
            <div className="rounded-base bg-surface-muted p-4">
              <h3 className="text-sm font-semibold">Ringkasan Board</h3>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
                <dt className="text-text-muted">Nama</dt>
                <dd className="font-medium">{form.name || '—'}</dd>
                <dt className="text-text-muted">Kota</dt>
                <dd>{form.city || '—'}</dd>
                <dt className="text-text-muted">Jenis</dt>
                <dd>{BOARD_TYPE_LABELS[form.type] || '—'}</dd>
                <dt className="text-text-muted">Jabatan</dt>
                <dd>{form.managerTitle || 'Tidak dicantumkan'}</dd>
                <dt className="text-text-muted">Kategori</dt>
                <dd>{defaultCategories.length + form.extraCategories.length}</dd>
                <dt className="text-text-muted">Target Berbahaya</dt>
                <dd>{form.dangerousTargetHours} jam</dd>
              </dl>
              {hasSummaryError && (
                <p className="mt-3 text-xs text-danger">Ada data yang perlu diperiksa.</p>
              )}
            </div>
          </Card>
        )}

        <div className="mt-5 flex flex-col-reverse justify-between gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            disabled={step === 0}
            onClick={() => {
              setErrors({});
              setStep((current) => Math.max(0, current - 1));
            }}
          >
            Kembali
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            {step === STEPS.length - 1 ? 'Buat Board' : 'Lanjut'}
          </Button>
        </div>
      </form>
    </section>
  );
}
