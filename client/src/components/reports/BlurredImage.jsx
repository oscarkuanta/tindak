import { useState } from 'react';
import { cn } from '../../lib/cn.js';

function SensitiveOverlay({ onReveal }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-text/40 p-4 text-center text-surface">
      <p className="text-sm font-medium">Foto ini mungkin sensitif</p>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onReveal();
        }}
        className="rounded-base border border-surface/70 px-3 py-1 text-sm font-semibold hover:bg-surface/20"
      >
        Tampilkan foto
      </button>
    </div>
  );
}

export function BlurredImage({
  src,
  alt,
  isBlurred,
  className,
  style,
  wrapperClassName,
  frameClassName,
}) {
  const [revealed, setRevealed] = useState(false);
  const hidden = isBlurred && !revealed;
  const label = hidden ? 'Foto diburamkan karena mungkin sensitif' : alt;

  if (frameClassName) {
    return (
      <div className={cn('photo-frame', frameClassName)}>
        <img src={src} alt="" aria-hidden="true" className="photo-frame__backdrop" />
        <img
          src={src}
          alt={label}
          className={cn('photo-frame__image', hidden && 'blur-xl')}
          loading="lazy"
        />
        {hidden && <SensitiveOverlay onReveal={() => setRevealed(true)} />}
      </div>
    );
  }

  if (!isBlurred) return <img src={src} alt={alt} className={className} style={style} />;

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      <img src={src} alt={label} className={cn(className, hidden && 'blur-xl')} style={style} />
      {hidden && <SensitiveOverlay onReveal={() => setRevealed(true)} />}
    </div>
  );
}
