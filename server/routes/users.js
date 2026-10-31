import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import auth, { optionalAuth } from '../middleware/auth.js';
import { handleUpload, uploadAvatar, removeUpload } from '../middleware/upload.js';
import { notify, unnotify } from '../utils/notify.js';
import { escapeRegex } from '../utils/serialize.js';
import { RESERVED, USERNAME_RE } from './auth.js';

const router = express.Router();

const PUBLIC_FIELDS =
  'name username avatar avatarUrl bio status location website createdAt followers following';

async function profileOf(userDoc, meId) {
  const u = userDoc.toObject ? userDoc.toObject() : userDoc;
  const postsCount = await Post.countDocuments({ author: u._id, hidden: { $ne: true } });
  const followers = (u.followers || []).map(String);
  return {
    _id: u._id,
    name: u.name,
    username: u.username,
    avatar: u.avatar || '',
    avatarUrl: u.avatarUrl || '',
    bio: u.bio || '',
    status: u.status || '',
    location: u.location || '',
    website: u.website || '',
    createdAt: u.createdAt,
    followersCount: followers.length,
    followingCount: (u.following || []).length,
    postsCount,
    isMe: !!meId && String(u._id) === String(meId),
    isFollowing: !!meId && followers.includes(String(meId)),
  };
}

function brief(u, followingSet) {
  return {
    _id: u._id,
    name: u.name,
    username: u.username,
    avatar: u.avatar || '',
    avatarUrl: u.avatarUrl || '',
    bio: u.bio || '',
    isFollowing: followingSet ? followingSet.has(String(u._id)) : false,
  };
}

async function followingSetOf(meId) {
  if (!meId) return new Set();
  const me = await User.findById(meId).select('following');
  return new Set((me?.following || []).map(String));
}

// ---------- GET own account ----------
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const profile = await profileOf(user, req.userId);
    res.json({ ...profile, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- UPDATE own profile ----------
router.patch('/me', auth, async (req, res) => {
  try {
    const { name, username, bio, status, location, website, avatar } = req.body || {};
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (username !== undefined && username.trim().toLowerCase() !== user.username) {
      const uname = username.trim().toLowerCase();
      if (!USERNAME_RE.test(uname)) {
        return res
          .status(400)
          .json({ error: 'Username must be 3–20 characters: letters, numbers or underscore' });
      }
      if (RESERVED.includes(uname)) return res.status(400).json({ error: 'That username is reserved' });
      const existing = await User.findOne({ username: uname });
      if (existing) return res.status(400).json({ error: 'Username already taken' });
      user.username = uname;
    }

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });
      user.name = name.trim().slice(0, 40);
    }
    if (bio !== undefined) user.bio = String(bio).slice(0, 200);
    if (status !== undefined) user.status = String(status).slice(0, 80);
    if (location !== undefined) user.location = String(location).slice(0, 60);
    if (website !== undefined) {
      let w = String(website).trim().slice(0, 100);
      if (w && !/^https?:\/\//i.test(w)) w = `https://${w}`;
      user.website = w;
    }
    if (typeof avatar === 'string') user.avatar = avatar.slice(0, 80);

    await user.save();
    const profile = await profileOf(user, req.userId);
    res.json({ ...profile, email: user.email, role: user.role });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------- AVATAR upload / remove ----------
router.post('/me/avatar', auth, handleUpload(uploadAvatar), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please choose an image' });
    const user = await User.findById(req.userId);
    if (!user) {
      removeUpload(`/uploads/avatars/${req.file.filename}`);
      return res.status(404).json({ error: 'User not found' });
    }
    removeUpload(user.avatarUrl);
    user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    res.json({ avatarUrl: user.avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/me/avatar', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    removeUpload(user.avatarUrl);
    user.avatarUrl = '';
    await user.save();
    res.json({ avatarUrl: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- SEARCH users ----------
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().replace(/^@/, '');
    if (!q) return res.json([]);
    const rx = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ $or: [{ name: rx }, { username: rx }] })
      .select(PUBLIC_FIELDS)
      .limit(20);
    const set = await followingSetOf(req.userId);
    res.json(users.map((u) => ({ ...brief(u, set), isMe: String(u._id) === String(req.userId) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- SUGGESTIONS (who to follow) ----------
router.get('/suggestions', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select('following');
    const exclude = [req.userId, ...(me?.following || []).map(String)];
    const users = await User.find({ _id: { $nin: exclude } })
      .select(PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .limit(6);
    res.json(users.map((u) => brief(u, new Set())));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- FOLLOW / UNFOLLOW ----------
router.post('/follow/:id', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }
    const me = await User.findById(req.userId);
    const them = await User.findById(targetId);
    if (!me || !them) return res.status(404).json({ error: 'User not found' });

    const isFollowing = me.following.some((id) => String(id) === targetId);

    if (isFollowing) {
      await User.updateOne({ _id: me._id }, { $pull: { following: them._id } });
      await User.updateOne({ _id: them._id }, { $pull: { followers: me._id } });
      await unnotify({ user: them._id, actor: me._id, type: 'follow' });
    } else {
      await User.updateOne({ _id: me._id }, { $addToSet: { following: them._id } });
      await User.updateOne({ _id: them._id }, { $addToSet: { followers: me._id } });
      await notify({ user: them._id, actor: me._id, type: 'follow' });
    }

    const fresh = await User.findById(them._id).select('followers');
    res.json({
      following: !isFollowing,
      followersCount: fresh.followers.length,
      message: isFollowing ? `Unfollowed @${them.username}` : `Now following @${them.username}`,
    });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- FOLLOWERS / FOLLOWING lists ----------
async function listConnections(req, res, field) {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).populate({
      path: field,
      select: PUBLIC_FIELDS,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const set = await followingSetOf(req.userId);
    res.json(
      user[field].map((u) => ({ ...brief(u, set), isMe: String(u._id) === String(req.userId) }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
router.get('/:username/followers', optionalAuth, (req, res) => listConnections(req, res, 'followers'));
router.get('/:username/following', optionalAuth, (req, res) => listConnections(req, res, 'following'));

// ---------- GET a profile (KEEP LAST) ----------
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).select(
      PUBLIC_FIELDS
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(await profileOf(user, req.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
