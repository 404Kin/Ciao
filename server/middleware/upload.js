import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i;

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function storageFor(sub) {
  const dir = ensure(path.join(UPLOADS_ROOT, sub));
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
}

const isImage = (f) => f.mimetype.startsWith('image/') && IMAGE_EXT.test(f.originalname);
const isVideo = (f) => f.mimetype.startsWith('video/') && VIDEO_EXT.test(f.originalname);
const isAudio = (f) =>
  (f.mimetype.startsWith('audio/') || f.mimetype === 'application/ogg') && AUDIO_EXT.test(f.originalname);

// Post media: up to 4 images / videos
export const uploadMedia = multer({
  storage: storageFor('media'),
  limits: { fileSize: 100 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) =>
    isImage(file) || isVideo(file) ? cb(null, true) : cb(new Error('Only images and videos are allowed')),
}).array('media', 4);

// Profile avatar / cover (single image)
export const uploadAvatar = multer({
  storage: storageFor('avatars'),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    isImage(file) ? cb(null, true) : cb(new Error('Only image files are allowed')),
}).single('avatar');

export const uploadCover = multer({
  storage: storageFor('avatars'),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    isImage(file) ? cb(null, true) : cb(new Error('Only image files are allowed')),
}).single('cover');

// Songs: one audio file + optional cover image
export const uploadSong = multer({
  storage: storageFor('songs'),
  limits: { fileSize: 40 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      return isAudio(file) ? cb(null, true) : cb(new Error('Please choose an audio file (mp3, wav, ogg, m4a…)'));
    }
    if (file.fieldname === 'cover') {
      return isImage(file) ? cb(null, true) : cb(new Error('Cover must be an image'));
    }
    cb(new Error('Unexpected file field'));
  },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

// Chain posts: one optional picture per contribution
export const uploadChainImage = multer({
  storage: storageFor('chains'),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    isImage(file) ? cb(null, true) : cb(new Error('Only image files are allowed')),
}).single('image');

export const isVideoFile = (f) => isVideo(f);

// Delete a stored file given its public url (e.g. /uploads/media/x.jpg)
export function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const rel = url.replace(/^\/uploads\//, '');
  const full = path.normalize(path.join(UPLOADS_ROOT, rel));
  if (!full.startsWith(UPLOADS_ROOT)) return; // path traversal guard
  fs.promises.unlink(full).catch(() => {});
}

// Wrap a multer middleware so errors become clean 400 JSON responses
export const handleUpload = (mw) => (req, res, next) =>
  mw(req, res, (err) => {
    if (!err) return next();
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'That file is too large'
        : err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT'
        ? 'Too many files'
        : err.message || 'Upload failed';
    res.status(400).json({ error: msg });
  });
