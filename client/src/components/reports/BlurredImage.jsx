import { useState } from 'react';
import { cn } from '../../lib/cn.js';

export function BlurredImage({ src, alt, isBlurred, className, style, wrapperClassName }) {
  const [revealed, setRevealed] = useState(false);
  const hidden = isBlurred && !revealed;

  if (!isBlurred) return <img src={src} alt={alt} className={className} style={style} />;

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      <img
        src={src}
        alt={hidden ? 'Foto diburamkan karena mungkin sensitif' : alt}
        className={cn(className, hidden && 'blur-xl')}
        style={style}
      />
      {hidden && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-text/40 p-4 text-center text-white">
          <p className="text-sm font-medium">Foto ini mungkin sensitif</p>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setRevealed(true);
            }}
            className="rounded-base border border-white/70 px-3 py-1 text-sm font-semibold hover:bg-white/20"
          >
            Tampilkan foto
          </button>
        </div>
      )}
    </div>
  );
}
