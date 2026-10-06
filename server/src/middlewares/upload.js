import multer from 'multer';
import { ERROR_CODES, REPORT_MAX_PHOTO_BYTES, REPORT_MAX_PHOTOS } from '@tindak/shared';
import { AppError } from '../utils/AppError.js';

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `Ukuran setiap foto maksimal ${REPORT_MAX_PHOTO_BYTES / 1024 / 1024} MB`,
  LIMIT_FILE_COUNT: `Maksimal ${REPORT_MAX_PHOTOS} foto`,
  LIMIT_UNEXPECTED_FILE: `Maksimal ${REPORT_MAX_PHOTOS} foto dengan nama field photos`,
};

const photosUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: REPORT_MAX_PHOTO_BYTES,
    files: REPORT_MAX_PHOTOS,
    fields: 20,
    fieldSize: 10_000,
  },
}).array('photos', REPORT_MAX_PHOTOS);

export function reportPhotosUpload(req, res, next) {
  photosUpload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      return next(
        new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Foto tidak valid', [
          { field: 'photos', message: MULTER_MESSAGES[error.code] ?? 'Foto tidak dapat diproses' },
        ]),
      );
    }
    next(error);
  });
}
