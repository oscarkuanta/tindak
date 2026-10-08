import { useEffect, useRef, useState } from 'react';
import { REPORT_MAX_PHOTOS } from '@tindak/shared';
import { compressImages } from '../../lib/compressImage.js';

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
  const [processing, setProcessing] = useState(false);

  async function addFiles(fileList) {
    const selected = Array.from(fileList ?? []);
    const room = REPORT_MAX_PHOTOS - files.length;
    const messages = [];
    if (selected.length > room) messages.push(`Maksimal ${REPORT_MAX_PHOTOS} foto.`);
    if (room <= 0) {
      setNotice(messages.join(' '));
      return;
    }
    setProcessing(true);
    setNotice('');
    const { files: ready, errors } = await compressImages(selected.slice(0, room));
    setProcessing(false);
    onChange([...files, ...ready]);
    setNotice([...errors, ...messages].join(' '));
  }

  return (
    <div>
      <span className="text-sm font-medium">Foto masalah</span>
      <p className="mt-1 text-xs text-text-muted">
        Wajib 1 foto, maksimal {REPORT_MAX_PHOTOS} foto. Langsung pakai foto dari kamera HP,
        ukurannya otomatis diperkecil.
      </p>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
        className="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-muted px-4 py-5 text-center hover:border-brand"
      >
        <span className="text-sm font-semibold">
          {processing ? 'Memperkecil foto...' : 'Pilih foto atau jatuhkan di sini'}
        </span>
        <span className="mt-1 text-xs text-text-muted" aria-live="polite">
          {files.length} dari {REPORT_MAX_PHOTOS} foto
        </span>
        <input
          aria-label="Unggah foto laporan"
          type="file"
          accept="image/*"
          multiple
          disabled={processing}
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
