import { REPORT_ALLOWED_PHOTO_TYPES, REPORT_MAX_PHOTO_BYTES } from '@tindak/shared';

export const MAX_SOURCE_PHOTO_BYTES = 60 * 1024 * 1024;
const MAX_SIDE = 1920;
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55];

export class PhotoError extends Error {}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      return createImageBitmap(file);
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

function jpegName(name) {
  return `${name.replace(/\.[^.]+$/, '') || 'foto'}.jpg`;
}

export async function compressImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new PhotoError(`${file.name}: file ini bukan foto.`);
  }
  if (file.size > MAX_SOURCE_PHOTO_BYTES) {
    throw new PhotoError(`${file.name}: foto terlalu besar (lebih dari 60 MB).`);
  }
  if (REPORT_ALLOWED_PHOTO_TYPES.includes(file.type) && file.size <= SKIP_BELOW_BYTES) {
    return file;
  }

  let source;
  try {
    source = await decode(file);
  } catch {
    if (REPORT_ALLOWED_PHOTO_TYPES.includes(file.type) && file.size <= REPORT_MAX_PHOTO_BYTES) {
      return file;
    }
    throw new PhotoError(
      `${file.name}: format foto ini tidak bisa dibaca. Coba foto JPG atau PNG.`,
    );
  }

  const width = source.width;
  const height = source.height;
  let scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  for (let round = 0; round < 3; round += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= REPORT_MAX_PHOTO_BYTES) {
        source.close?.();
        return new File([blob], jpegName(file.name), {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });
      }
    }
    scale *= 0.75;
  }
  source.close?.();
  throw new PhotoError(`${file.name}: foto tidak bisa diperkecil. Coba foto lain.`);
}

export async function compressImages(fileList) {
  const files = [];
  const errors = [];
  for (const file of Array.from(fileList ?? [])) {
    try {
      files.push(await compressImage(file));
    } catch (error) {
      errors.push(error instanceof PhotoError ? error.message : `${file.name}: gagal diproses.`);
    }
  }
  return { files, errors };
}
