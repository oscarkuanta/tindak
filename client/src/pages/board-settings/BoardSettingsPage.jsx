import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { BOARD_TYPE_LABELS, boardCategorySchema, updateBoardSchema } from '@tindak/shared';
import { Alert, Button, Card, Input, Spinner } from '../../components/ui/index.js';
import { EmptyState } from '../../components/boards/EmptyState.jsx';
import { VerificationBadge } from '../../components/boards/BoardBadges.jsx';
import { HandlerManagement } from '../../components/boards/HandlerManagement.jsx';
import {
  useBoard,
  useCreateBoardCategory,
  useDeleteBoardCategory,
  useRenameBoardCategory,
  useReorderBoardCategories,
  useUpdateBoard,
} from '../../features/boards/hooks.js';
import { VerificationTimeline } from '../../components/trust/VerificationTimeline.jsx';

function ForbiddenSettings() {
  return (
    <EmptyState
      title="403 · Akses ditolak"
      description="Hanya Penindak Utama yang dapat mengubah pengaturan Board ini."
      action={
        <Link to="/board-saya" className="text-sm font-semibold text-brand hover:underline">
          Kembali ke Board Saya
        </Link>
      }
    />
  );
}

function getSettingsValues(board) {
  return {
    name: board?.name ?? '',
    managerTitle: board?.managerTitle ?? '',
    description: board?.description ?? '',
    dangerousTargetHours: board?.dangerousTargetHours ?? 48,
  };
}

export function BoardSettingsPage() {
  const { slug } = useParams();
  const boardQuery = useBoard(slug);
  const updateMutation = useUpdateBoard(slug);
  const createCategoryMutation = useCreateBoardCategory(slug);
  const renameCategoryMutation = useRenameBoardCategory(slug);
  const deleteCategoryMutation = useDeleteBoardCategory(slug);
  const reorderMutation = useReorderBoardCategories(slug);
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const board = boardQuery.data?.data;
  const formValues = values ?? getSettingsValues(board);

  if (boardQuery.isPending)
    return (
      <div className="py-12">
        <Spinner label="Memuat pengaturan Board" />
      </div>
    );
  if (boardQuery.error?.code === 'BOARD_NOT_FOUND' || boardQuery.error?.status === 404) {
    return (
      <EmptyState
        title="Board tidak ditemukan"
        action={
          <Link to="/cari" className="text-sm font-semibold text-brand">
            Cari Board
          </Link>
        }
      />
    );
  }
  if (boardQuery.error?.code === 'FORBIDDEN' || boardQuery.error?.status === 403)
    return <ForbiddenSettings />;
  if (boardQuery.isError) return <Alert>{boardQuery.error.message}</Alert>;
  if (board.viewer?.role !== 'OWNER') return <ForbiddenSettings />;

  const categories = board.categories ?? [];

  function updateField(field, value) {
    setValues((current) => ({ ...(current ?? getSettingsValues(board)), [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveMessage('');
  }

  async function saveBoard(event) {
    event.preventDefault();
    const result = updateBoardSchema.safeParse({
      ...formValues,
      dangerousTargetHours: Number(formValues.dangerousTargetHours),
    });
    if (!result.success) {
      setErrors(
        Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    try {
      const response = await updateMutation.mutateAsync(result.data);
      setValues(getSettingsValues(response.data));
      setSaveMessage('Informasi Board berhasil disimpan.');
      setErrors({});
    } catch (error) {
      setSaveMessage(error.message || 'Perubahan belum dapat disimpan.');
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    const result = boardCategorySchema.safeParse({ name: categoryName });
    if (!result.success) {
      setCategoryError(result.error.issues[0].message);
      return;
    }
    try {
      await createCategoryMutation.mutateAsync(result.data);
      setCategoryName('');
      setCategoryError('');
    } catch (error) {
      setCategoryError(error.message || 'Kategori belum dapat ditambahkan.');
    }
  }

  async function saveCategoryName(category) {
    const result = boardCategorySchema.safeParse({ name: editingName });
    if (!result.success) {
      setCategoryError(result.error.issues[0].message);
      return;
    }
    try {
      await renameCategoryMutation.mutateAsync({ id: category.id, name: result.data.name });
      setEditingId(null);
      setEditingName('');
      setCategoryError('');
    } catch (error) {
      setCategoryError(error.message || 'Nama kategori belum dapat diubah.');
    }
  }

  async function removeCategory(category) {
    if (!window.confirm(`Hapus kategori “${category.name}”?`)) return;
    try {
      await deleteCategoryMutation.mutateAsync(category.id);
      setCategoryError('');
    } catch (error) {
      setCategoryError(error.message || 'Kategori belum dapat dihapus.');
    }
  }

  async function moveCategory(index, offset) {
    const reordered = [...categories];
    const [category] = reordered.splice(index, 1);
    reordered.splice(index + offset, 0, category);
    try {
      await reorderMutation.mutateAsync(reordered.map((item) => item.id));
      setCategoryError('');
    } catch (error) {
      setCategoryError(error.message || 'Urutan kategori belum dapat disimpan.');
    }
  }

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-5">
      <header>
        <Link to={`/b/${slug}`} className="text-sm font-medium text-brand hover:underline">
          ← Kembali ke Board
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Pengaturan Board</h1>
        <p className="mt-1 text-sm text-text-muted">{board.name}</p>
      </header>

      <Card as="section">
        <h2 className="text-lg font-semibold">Informasi</h2>
        <form className="mt-4 flex flex-col gap-4" onSubmit={saveBoard} noValidate>
          <Input
            label="Nama Board"
            value={formValues.name}
            error={errors.name}
            onChange={(event) => updateField('name', event.target.value)}
          />
          <Input
            label="Jabatan pengelola (opsional)"
            value={formValues.managerTitle}
            error={errors.managerTitle}
            hint="Hanya informasi, bukan status resmi."
            onChange={(event) => updateField('managerTitle', event.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-description" className="text-sm font-medium">
              Deskripsi dan cakupan
            </label>
            <textarea
              id="settings-description"
              value={formValues.description}
              maxLength={1000}
              rows={5}
              onChange={(event) => updateField('description', event.target.value)}
              className={`rounded-base border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${errors.description ? 'border-danger' : 'border-border'}`}
            />
            <div className="flex justify-between text-xs text-text-muted">
              {errors.description && <span className="text-danger">{errors.description}</span>}
              <span className="ml-auto">{formValues.description.length}/1000</span>
            </div>
          </div>
          <Input
            label="Target jam laporan Berbahaya"
            type="number"
            min={1}
            max={720}
            value={formValues.dangerousTargetHours}
            error={errors.dangerousTargetHours}
            onChange={(event) => updateField('dangerousTargetHours', event.target.value)}
          />
          <div className="grid gap-3 rounded-base bg-surface-muted p-4 text-sm sm:grid-cols-3">
            <p>
              <span className="block text-xs text-text-muted">Kota</span>
              {board.city}
            </p>
            <p>
              <span className="block text-xs text-text-muted">Jenis</span>
              {BOARD_TYPE_LABELS[board.type]}
            </p>
            <p>
              <span className="block text-xs text-text-muted">Verifikasi</span>
              <VerificationBadge verification={board.verification} />
            </p>
            <p className="text-xs text-text-muted sm:col-span-3">
              Kota, jenis Board, dan status verifikasi tidak dapat diubah.
            </p>
          </div>
          {saveMessage && (
            <p
              role="status"
              className={`text-sm ${updateMutation.isError ? 'text-danger' : 'text-success'}`}
            >
              {saveMessage}
            </p>
          )}
          <Button type="submit" loading={updateMutation.isPending}>
            Simpan Informasi
          </Button>
        </form>
      </Card>

      <Card as="section">
        <h2 className="text-lg font-semibold">Verifikasi</h2>
        <div className="mt-3">
          <VerificationBadge verification={board.verification} />
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Status Official diberikan oleh Admin Board berdasarkan rating dan kepercayaan pengguna.
          Tidak ada pengajuan yang perlu dilakukan.
        </p>
        <h3 className="mt-4 mb-2 text-sm font-semibold">Riwayat verifikasi</h3>
        <VerificationTimeline entries={board.verificationHistory ?? []} />
      </Card>

      <Card as="section">
        <h2 className="text-lg font-semibold">Kategori</h2>
        <p className="mt-1 text-sm text-text-muted">
          Tambah, ubah nama, hapus, atau atur urutan kategori.
        </p>
        {categoryError && <Alert className="mt-3">{categoryError}</Alert>}
        <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={addCategory}>
          <Input
            label="Nama kategori baru"
            value={categoryName}
            maxLength={40}
            onChange={(event) => {
              setCategoryName(event.target.value);
              setCategoryError('');
            }}
          />
          <Button type="submit" loading={createCategoryMutation.isPending}>
            Tambah Kategori
          </Button>
        </form>
        <ol className="mt-4 flex flex-col gap-2">
          {categories.map((category, index) => (
            <li
              key={category.id}
              className="flex flex-col gap-2 rounded-base border border-border p-3 sm:flex-row sm:items-center"
            >
              <span className="w-7 shrink-0 text-sm text-text-muted">{index + 1}.</span>
              {editingId === category.id ? (
                <div className="flex min-w-0 flex-1 gap-2">
                  <Input
                    aria-label={`Nama kategori ${category.name}`}
                    value={editingName}
                    maxLength={40}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                  <Button
                    size="sm"
                    loading={renameCategoryMutation.isPending}
                    onClick={() => saveCategoryName(category)}
                  >
                    Simpan
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                    Batal
                  </Button>
                </div>
              ) : (
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {category.name}
                  {category.isDefault && (
                    <span className="ml-2 text-xs text-text-muted">Bawaan</span>
                  )}
                </span>
              )}
              {editingId !== category.id && (
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Naikkan ${category.name}`}
                    disabled={index === 0 || reorderMutation.isPending}
                    onClick={() => moveCategory(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Turunkan ${category.name}`}
                    disabled={index === categories.length - 1 || reorderMutation.isPending}
                    onClick={() => moveCategory(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                    }}
                  >
                    Ubah nama
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => removeCategory(category)}
                    disabled={deleteCategoryMutation.isPending}
                  >
                    Hapus
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      </Card>

      <HandlerManagement slug={slug} boardName={board.name} />
    </section>
  );
}
