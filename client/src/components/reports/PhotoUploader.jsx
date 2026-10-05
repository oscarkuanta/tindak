import { useEffect, useRef, useState } from 'react';
import {
  REPORT_ALLOWED_PHOTO_TYPES,
  REPORT_MAX_PHOTOS,
  REPORT_MAX_PHOTO_BYTES,
} from '@tindak/shared';

function formatMegabytes(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function PhotoPreview({ file }) {
  const imageRef = useRef(null);

  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function' || !imageRef.current) return undefined;
    const url = URL.createObjectURL(file);
    imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return <img ref={imageRef} alt={`Pratinjau ${file.name}`} className="h-24 w-full object-cover" />;
}

export function PhotoUploader({ files, onChange, error }) {
  const [notice, setNotice] = useState('');

  function addFiles(fileList) {
    const next = [...files];
    const messages = [];
    for (const file of Array.from(fileList ?? [])) {
      if (!REPORT_ALLOWED_PHOTO_TYPES.includes(file.type)) {
        messages.push(`${file.name}: gunakan JPG, PNG, atau WebP.`);
      } else if (file.size > REPORT_MAX_PHOTO_BYTES) {
        messages.push(`${file.name}: ukuran maksimal ${formatMegabytes(REPORT_MAX_PHOTO_BYTES)}.`);
      } else if (next.length >= REPORT_MAX_PHOTOS) {
        messages.push(`Maksimal ${REPORT_MAX_PHOTOS} foto.`);
      } else {
        next.push(file);
      }
    }
    onChange(next);
    setNotice(messages.join(' '));
  }

  return (
    <div>
      <span className="text-sm font-medium">Foto masalah</span>
      <p className="mt-1 text-xs text-text-muted">
        Wajib 1 foto, maksimal {REPORT_MAX_PHOTOS} foto. JPG, PNG, atau WebP hingga 5 MB per foto.
      </p>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
        className="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-muted px-4 py-5 text-center hover:border-brand"
      >
        <span className="text-sm font-semibold">Pilih foto atau jatuhkan di sini</span>
        <span className="mt-1 text-xs text-text-muted">
          {files.length} dari {REPORT_MAX_PHOTOS} foto
        </span>
        <input
          aria-label="Unggah foto laporan"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </label>
      {(error || notice) && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error || notice}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="relative overflow-hidden rounded-base border border-border bg-surface"
            >
              {typeof URL.createObjectURL === 'function' ? (
                <PhotoPreview file={file} />
              ) : (
                <div className="flex h-24 items-center justify-center px-2 text-center text-xs text-text-muted">
                  {file.name}
                </div>
              )}
              <button
                type="button"
                aria-label={`Hapus foto ${index + 1}`}
                onClick={() => onChange(files.filter((_item, itemIndex) => itemIndex !== index))}
                className="w-full border-t border-border px-2 py-2 text-xs font-semibold text-danger hover:bg-surface-muted"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
