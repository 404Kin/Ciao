import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import userRoutes from './routes/users.js';
import songRoutes from './routes/songs.js';
import notificationRoutes from './routes/notifications.js';
import chainRoutes from './routes/chains.js';
import adminRoutes from './routes/admin.js';
import User from './models/User.js';
import Song from './models/Song.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- CORS: CLIENT_URL (comma separated) + any localhost / LAN origin ----------
const allowed = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes(origin) || devOrigin.test(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

// Uploaded files (images, videos, songs). Static handler supports Range requests,
// which video seeking and audio scrubbing need.
app.use(
  '/uploads',
  express.static(UPLOADS, {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

// Health check
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: '🌸 Ciao API is running',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chains', chainRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: err.message });
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

// ---------- Built-in demo songs (so the music player works out of the box) ----------
const DEMO_SONGS = [
  { file: 'demo-morning-light.mp3', title: 'Morning Light', artist: 'Ciao Sounds', duration: 48 },
  { file: 'demo-rainy-window.mp3', title: 'Rainy Window', artist: 'Ciao Sounds', duration: 48 },
  { file: 'demo-sunset-drive.mp3', title: 'Sunset Drive', artist: 'Ciao Sounds', duration: 48 },
  { file: 'demo-midnight-city.mp3', title: 'Midnight City', artist: 'Ciao Sounds', duration: 48 },
  { file: 'demo-cozy-corner.mp3', title: 'Cozy Corner', artist: 'Ciao Sounds', duration: 48 },
];

async function seedDemoSongs() {
  for (const d of DEMO_SONGS) {
    const onDisk = fs.existsSync(path.join(UPLOADS, 'songs', d.file));
    if (!onDisk) continue;
    const url = `/uploads/songs/${d.file}`;
    const exists = await Song.findOne({ url });
    if (!exists) {
      await Song.create({ title: d.title, artist: d.artist, url, duration: d.duration, isDemo: true });
      console.log(`🎵 Added demo song: ${d.title}`);
    }
  }
}

// Emails listed in ADMIN_EMAILS (server/.env) become admins
async function promoteAdmins() {
  const emails = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) {
    console.log('ℹ️  No ADMIN_EMAILS set in server/.env, so there is no admin account yet.');
    return;
  }
  const r = await User.updateMany({ email: { $in: emails } }, { $set: { role: 'admin' } });
  if (r.modifiedCount) console.log(`🛡️  Admin rights granted to ${r.modifiedCount} account(s)`);
}

// ---------- Start ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected successfully');
    await seedDemoSongs();
    await promoteAdmins();
    app.listen(PORT, () => {
      console.log(`🌸 Ciao server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Check MONGO_URI in server/.env and that your IP is allowed in MongoDB Atlas.');
    process.exit(1);
  });

export default app;
