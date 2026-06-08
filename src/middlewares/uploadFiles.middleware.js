import multer from 'multer';

const allowedAudioTypes = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/mp4',
]);

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const uploadProductFiles = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio' && allowedAudioTypes.has(file.mimetype)) {
      return cb(null, true);
    }

    if (file.fieldname === 'cover' && allowedImageTypes.has(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error('Invalid file type'));
  },
});
