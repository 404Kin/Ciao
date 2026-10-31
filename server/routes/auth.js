import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Song from '../models/Song.js';
import Notification from '../models/Notification.js';
import Chain from '../models/Chain.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import auth, { isBanned, banMessage, liftIfExpired } from '../middleware/auth.js';
import { removeUpload } from '../middleware/upload.js';

const router = express.Router();

export const RESERVED = ['me', 'search', 'suggestions', 'admin', 'api', 'login', 'register', 'settings'];
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const adminEmails = () => (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ---------- REGISTER ----------
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, avatar } = req.body || {};

    if (!name?.trim() || !username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const uname = username.trim().toLowerCase();
    if (!USERNAME_RE.test(uname)) {
      return res
        .status(400)
        .json({ error: 'Username must be 3–20 characters: letters, numbers or underscore' });
    }
    if (RESERVED.includes(uname)) {
      return res.status(400).json({ error: 'That username is reserved' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({
      $or: [{ email: email.trim().toLowerCase() }, { username: uname }],
    });
    if (existing) {
      const field = existing.email === email.trim().toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ error: `This ${field} is already taken` });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim().slice(0, 40),
      username: uname,
      email: email.trim().toLowerCase(),
      password: hash,
      avatar: typeof avatar === 'string' ? avatar.slice(0, 80) : '',
      role: adminEmails().includes(email.trim().toLowerCase()) ? 'admin' : 'user',
    });

    res.status(201).json({ token: signToken(user._id), user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- LOGIN (email OR username) ----------
router.post('/login', async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || req.body?.email || '').trim().toLowerCase();
    const { password } = req.body || {};

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) return res.status(404).json({ error: 'No account found with those details' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Wrong password' });

    await liftIfExpired(user);
    if (isBanned(user)) return res.status(403).json({ error: banMessage(user), code: 'BANNED' });

    res.json({ token: signToken(user._id), user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CHANGE PASSWORD ----------
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE ACCOUNT ----------
router.delete('/account', auth, async (req, res) => {
  try {
    const { password } = req.body || {};
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await bcrypt.compare(password || '', user.password);
    if (!ok) return res.status(401).json({ error: 'Password is incorrect' });

    const id = user._id;

    // posts + their media + comments
    const posts = await Post.find({ author: id });
    for (const p of posts) {
      (p.media || []).forEach((m) => removeUpload(m.url));
      if (p.image) removeUpload(p.image);
    }
    const postIds = posts.map((p) => p._id);
    await Comment.deleteMany({ post: { $in: postIds } });
    await Post.deleteMany({ author: id });
    await Notification.deleteMany({ $or: [{ user: id }, { actor: id }, { post: { $in: postIds } }] });

    // songs uploaded by the user
    const songs = await Song.find({ uploader: id });
    for (const s of songs) {
      removeUpload(s.url);
      removeUpload(s.cover);
    }
    await Post.updateMany({ song: { $in: songs.map((s) => s._id) } }, { $set: { song: null } });
    await Song.deleteMany({ uploader: id });

    // clean up activity on other people's content
    const myComments = await Comment.find({ author: id }).select('post');
    for (const c of myComments) {
      await Post.updateOne({ _id: c.post }, { $inc: { commentsCount: -1 } });
    }
    await Comment.deleteMany({ author: id });
    await Comment.updateMany({}, { $pull: { likes: id } });
    await Post.updateMany({}, { $pull: { reactions: { user: id }, likes: id } });
    await Song.updateMany({}, { $pull: { likes: id } });
    await User.updateMany({}, { $pull: { followers: id, following: id } });

    // chains: delete the ones I started, withdraw from the ones I was tagged in
    const owned = await Chain.find({ owner: id });
    for (const c of owned) c.entries.forEach((e) => removeUpload(e.image));
    await Notification.deleteMany({ chain: { $in: owned.map((c) => c._id) } });
    await Chain.deleteMany({ owner: id });
    const tagged = await Chain.find({ invited: id });
    for (const c of tagged) {
      c.entries.filter((e) => String(e.user) === String(id)).forEach((e) => removeUpload(e.image));
      c.entries = c.entries.filter((e) => String(e.user) !== String(id));
      c.invited = c.invited.filter((u) => String(u) !== String(id));
      await c.save();
    }

    // private chats
    const convs = await Conversation.find({ participants: id }).select('_id');
    const convIds = convs.map((c) => c._id);
    const msgs = await Message.find({ conversation: { $in: convIds }, image: { $ne: '' } }).select('image');
    msgs.forEach((m) => removeUpload(m.image));
    await Message.deleteMany({ conversation: { $in: convIds } });
    await Conversation.deleteMany({ _id: { $in: convIds } });

    removeUpload(user.avatarUrl);
    await User.deleteOne({ _id: id });

    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
