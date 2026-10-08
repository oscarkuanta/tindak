import { useState } from 'react';
import { BlurredImage } from './BlurredImage.jsx';

export function BeforeAfterSlider({ before, after }) {
  const [position, setPosition] = useState(50);
  const [revealed, setRevealed] = useState(false);
  if (!before?.url || !after?.url) {
    return <p className="text-sm text-text-muted">Foto sebelum dan sesudah belum lengkap.</p>;
  }

  if ((before.isBlurred || after.isBlurred) && !revealed) {
    return (
      <figure className="grid grid-cols-2 gap-2">
        <BlurredImage
          src={before.url}
          alt="Foto sebelum penindakan"
          isBlurred={before.isBlurred}
          className="aspect-[4/3] w-full rounded-card object-cover"
        />
        <BlurredImage
          src={after.url}
          alt="Foto sesudah penindakan"
          isBlurred={after.isBlurred}
          className="aspect-[4/3] w-full rounded-card object-cover"
        />
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="col-span-2 text-sm font-semibold text-brand hover:underline"
        >
          Tampilkan perbandingan
        </button>
      </figure>
    );
  }

  return (
    <figure className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-surface-muted">
        <img
          src={before.url}
          alt="Foto sebelum penindakan"
          className={`absolute inset-0 size-full object-cover`}
        />
        <div
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <img
            src={after.url}
            alt="Foto sesudah penindakan"
            className={`absolute inset-0 size-full max-w-none object-cover`}
            style={{ width: `${10000 / position}%` }}
          />
        </div>
        <span className="absolute top-3 left-3 rounded-full bg-text/75 px-2.5 py-1 text-xs font-semibold text-surface">
          Sesudah
        </span>
        <span className="absolute top-3 right-3 rounded-full bg-text/75 px-2.5 py-1 text-xs font-semibold text-surface">
          Sebelum
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="99"
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        aria-label="Bandingkan foto sebelum dan sesudah"
        className="w-full accent-brand"
      />
    </figure>
  );
}
