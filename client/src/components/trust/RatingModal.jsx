import { useState } from 'react';
import { RATING_QUICK_TAG_META, RATING_QUICK_TAGS, ratingRequestSchema } from '@tindak/shared';
import { Alert, Button, Modal, Spinner } from '../ui/index.js';
import { useMyRating, useRateBoard } from '../../features/trust/hooks.js';
import { apiErrorMessage } from '../../features/auth/formErrors.js';
import { useToast } from '../../features/boards/toastContext.js';

function RatingForm({ slug, current, onDone }) {
  const [stars, setStars] = useState(current?.stars ?? 0);
  const [quickTag, setQuickTag] = useState(current?.quickTag ?? null);
  const [error, setError] = useState(null);
  const mutation = useRateBoard(slug);
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = ratingRequestSchema.safeParse({ stars: stars || undefined, quickTag });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Pilih jumlah bintang');
      return;
    }
    try {
      await mutation.mutateAsync(parsed.data);
      showToast(current ? 'Rating diperbarui' : 'Terima kasih atas rating kamu');
      onDone();
    } catch (apiError) {
      setError(apiErrorMessage(apiError));
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Seberapa puas kamu dengan Board ini?</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} bintang`}
              aria-pressed={stars === value}
              onClick={() => setStars(value)}
              className={`text-3xl leading-none transition-transform hover:scale-110 ${value <= stars ? 'text-warning' : 'text-border'}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Pilihan cepat (opsional)</legend>
        <div className="flex flex-wrap gap-2">
          {RATING_QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={quickTag === tag}
              onClick={() => setQuickTag((value) => (value === tag ? null : tag))}
              className={`rounded-full border px-3 py-1 text-sm ${quickTag === tag ? 'border-brand bg-brand-soft text-brand' : 'border-border hover:bg-surface-muted'}`}
            >
              {RATING_QUICK_TAG_META[tag].emoji} {RATING_QUICK_TAG_META[tag].label}
            </button>
          ))}
        </div>
      </fieldset>
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Kirim Rating
        </Button>
      </div>
    </form>
  );
}

export function RatingModal({ slug, open, onClose }) {
  const query = useMyRating(slug, { enabled: open });
  const data = query.data?.data;

  return (
    <Modal open={open} onClose={onClose} title="Beri Rating Board">
      {query.isPending ? (
        <Spinner label="Memuat rating" />
      ) : query.isError ? (
        <Alert>{apiErrorMessage(query.error)}</Alert>
      ) : data.canRate ? (
        <RatingForm slug={slug} current={data.rating} onDone={onClose} />
      ) : (
        <>
          <Alert tone="info">{data.reason}</Alert>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
