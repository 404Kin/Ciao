import express from 'express';
import Song from '../models/Song.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { verifyToken as auth } from '../middleware/auth.js';
import { handleUpload, uploadSong, removeUpload } from '../middleware/upload.js';
import { USER_FIELDS, serializeSong, escapeRegex } from '../utils/serialize.js';

const router = express.Router();

// GET /api/songs?scope=all|mine|liked&q=
router.get('/', auth, async (req, res) => {
  try {
    const { scope = 'all', q } = req.query;
    const filter = {};
    if (scope === 'mine') filter.uploader = req.userId;
    if (scope === 'liked') filter.likes = req.userId;
    if (q) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ title: rx }, { artist: rx }];
    }

    const songs = await Song.find(filter)
      .sort({ createdAt: -1 })
      .limit(300)
      .populate('uploader', USER_FIELDS);
    res.json(songs.map((s) => serializeSong(s, req.userId)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/songs   (multipart: audio, cover?, title, artist, duration)
router.post('/', auth, handleUpload(uploadSong), async (req, res) => {
  const audio = req.files?.audio?.[0];
  const cover = req.files?.cover?.[0];
  const cleanup = () => {
    if (audio) removeUpload(`/uploads/songs/${audio.filename}`);
    if (cover) removeUpload(`/uploads/songs/${cover.filename}`);
  };
  try {
    if (!audio) {
      cleanup();
      return res.status(400).json({ error: 'Please choose an audio file' });
    }

    const me = await User.findById(req.userId).select('name');
    const fallbackTitle = audio.originalname.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const title = String(req.body.title || '').trim() || fallbackTitle || 'Untitled';
    const artist = String(req.body.artist || '').trim() || me?.name || 'Unknown artist';
    const duration = Math.max(0, Math.round(parseFloat(req.body.duration) || 0));

    const song = await Song.create({
      title: title.slice(0, 80),
      artist: artist.slice(0, 60),
      url: `/uploads/songs/${audio.filename}`,
      cover: cover ? `/uploads/songs/${cover.filename}` : '',
      duration,
      uploader: req.userId,
    });
    await song.populate('uploader', USER_FIELDS);
    res.status(201).json({ song: serializeSong(song, req.userId) });
  } catch (err) {
    cleanup();
    console.error('Upload song error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/songs/link  { url, title?, artist?, cover?, duration? }  -> stream a song from a link
router.post('/link', auth, async (req, res) => {
  try {
    const raw = String(req.body?.url || '').trim();
    let parsed;
    try { parsed = new URL(raw); } catch { return res.status(400).json({ error: 'That does not look like a valid link' }); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'Only http(s) links are supported' });
    if (raw.length > 500) return res.status(400).json({ error: 'Link is too long' });
    if (/(^|\.)(youtube\.com|youtu\.be|spotify\.com|soundcloud\.com)$/i.test(parsed.hostname)) {
      return res.status(400).json({ error: 'Streaming-site pages can’t be played here. Paste a direct audio file link (ending in .mp3, .m4a, .wav, .ogg…).' });
    }

    const me = await User.findById(req.userId).select('name');
    const last = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    const fallback = last.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const song = await Song.create({
      title: (String(req.body.title || '').trim() || fallback || 'Untitled').slice(0, 80),
      artist: (String(req.body.artist || '').trim() || me?.name || 'Unknown artist').slice(0, 60),
      url: raw,
      duration: Math.max(0, Math.round(parseFloat(req.body.duration) || 0)),
      uploader: req.userId,
      external: true,
    });
    await song.populate('uploader', USER_FIELDS);
    res.status(201).json({ song: serializeSong(song, req.userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/songs/:id/play  (count a play)
router.post('/:id/play', auth, async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } }, { returnDocument: 'after' });
    if (!song) return res.status(404).json({ error: 'Song not found' });
    res.json({ plays: song.plays });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/songs/:id/like  (toggle favourite)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    const has = song.likes.some((id) => String(id) === req.userId);
    await Song.updateOne(
      { _id: song._id },
      has ? { $pull: { likes: req.userId } } : { $addToSet: { likes: req.userId } }
    );
    const fresh = await Song.findById(song._id).select('likes');
    res.json({ liked: !has, likesCount: fresh.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/songs/:id  (only the uploader)
router.delete('/:id', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    if (song.isDemo) return res.status(403).json({ error: 'Built-in songs cannot be deleted' });
    if (String(song.uploader) !== req.userId) {
      return res.status(403).json({ error: 'You can only delete songs you uploaded' });
    }
    removeUpload(song.url);
    removeUpload(song.cover);
    await Post.updateMany({ song: song._id }, { $set: { song: null } });
    await Song.deleteOne({ _id: song._id });
    res.json({ message: 'Song deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
