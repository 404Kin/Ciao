import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Song from '../models/Song.js';
import Chain from '../models/Chain.js';
import Report from '../models/Report.js';
import Notification from '../models/Notification.js';
import AdminAction from '../models/AdminAction.js';
import { verifyToken as auth, requireAdmin } from '../middleware/auth.js';
import { removeUpload } from '../middleware/upload.js';
import { notify } from '../utils/notify.js';
import { USER_FIELDS, serializePost, escapeRegex } from '../utils/serialize.js';

const router = express.Router();
router.use(auth, requireAdmin);

const POST_POPULATE = [
  { path: 'author', select: USER_FIELDS },
  { path: 'song', populate: { path: 'uploader', select: USER_FIELDS } },
];

const log = (admin, action, targetUser = null, note = '') =>
  AdminAction.create({ admin, action, targetUser, note: String(note).slice(0, 300) }).catch(() => {});

async function deletePostCompletely(post) {
  (post.media || []).forEach((m) => removeUpload(m.url));
  if (post.image) removeUpload(post.image);
  await Comment.deleteMany({ post: post._id });
  await Notification.deleteMany({ post: post._id });
  await User.updateMany({ saved: post._id }, { $pull: { saved: post._id } });
  await Post.deleteOne({ _id: post._id });
}

async function banUser(target, { days, reason }) {
  const until = Number(days) > 0 ? new Date(Date.now() + Number(days) * 86400000) : null;
  await User.updateOne(
    { _id: target._id },
    { $set: { banned: true, bannedUntil: until, banReason: String(reason || 'Violating community guidelines').slice(0, 200) } }
  );
  // their posts disappear from feeds while suspended
  await Post.updateMany({ author: target._id, hidden: false }, { $set: { hidden: true, hiddenReason: 'ban' } });
  return until;
}

// ---------- overview ----------
router.get('/stats', async (req, res) => {
  try {
    const week = new Date(Date.now() - 7 * 86400000);
    const [users, posts, songs, chains, openReports, banned, newUsers, newPosts] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Song.countDocuments(),
      Chain.countDocuments(),
      Report.distinct('post', { status: 'open' }).then((a) => a.length),
      User.countDocuments({ banned: true }),
      User.countDocuments({ createdAt: { $gte: week } }),
      Post.countDocuments({ createdAt: { $gte: week } }),
    ]);
    res.json({ users, posts, songs, chains, openReports, banned, newUsers, newPosts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- reported posts (grouped by post) ----------
router.get('/reports', async (req, res) => {
  try {
    const status = ['open', 'dismissed', 'actioned'].includes(req.query.status) ? req.query.status : 'open';
    const reports = await Report.find({ status }).sort({ createdAt: -1 }).limit(300).populate('reporter', USER_FIELDS);
    const byPost = new Map();
    for (const r of reports) {
      const key = String(r.post);
      if (!byPost.has(key)) byPost.set(key, []);
      byPost.get(key).push({
        reporter: r.reporter ? { _id: r.reporter._id, username: r.reporter.username } : null,
        reason: r.reason,
        details: r.details,
        createdAt: r.createdAt,
      });
    }
    const posts = await Post.find({ _id: { $in: [...byPost.keys()] } }).populate(POST_POPULATE);
    const out = posts
      .map((p) => ({
        post: serializePost(p, req.userId, new Set()),
        hidden: !!p.hidden,
        reports: byPost.get(String(p._id)),
      }))
      .sort((a, b) => b.reports.length - a.reports.length);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// keep the post (reports were wrong)
router.post('/reports/:postId/dismiss', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    await Report.updateMany({ post: req.params.postId, status: 'open' }, { $set: { status: 'dismissed' } });
    if (post) {
      post.hidden = false;
      post.hiddenReason = '';
      post.reportCount = 0;
      await post.save();
      await log(req.userId, 'dismiss_reports', post.author, `post ${post._id}`);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// remove the post, tell the author, optionally suspend them
router.post('/reports/:postId/remove', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const reason = String(req.body?.reason || 'It broke the community guidelines').slice(0, 200);
    const author = await User.findById(post.author);

    await Report.updateMany({ post: post._id, status: 'open' }, { $set: { status: 'actioned' } });
    await deletePostCompletely(post);

    if (author) {
      await User.updateOne({ _id: author._id }, { $inc: { warnings: 1 } });
      await notify({ user: author._id, actor: req.userId, type: 'warning', meta: `One of your posts was removed. ${reason}` });
      if (req.body?.suspend && author.role !== 'admin') {
        const until = await banUser(author, { days: req.body.days, reason });
        await log(req.userId, 'suspend_user', author._id, until ? `until ${until.toISOString().slice(0, 10)}: ${reason}` : `permanent: ${reason}`);
      }
    }
    await log(req.userId, 'remove_post', author?._id, reason);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- direct content removal ----------
router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const reason = String(req.body?.reason || 'It broke the community guidelines').slice(0, 200);
    await Report.updateMany({ post: post._id }, { $set: { status: 'actioned' } });
    const authorId = post.author;
    await deletePostCompletely(post);
    await User.updateOne({ _id: authorId }, { $inc: { warnings: 1 } });
    await notify({ user: authorId, actor: req.userId, type: 'warning', meta: `One of your posts was removed. ${reason}` });
    await log(req.userId, 'remove_post', authorId, reason);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/songs/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    if (song.isDemo) return res.status(400).json({ error: 'Built-in songs cannot be deleted' });
    removeUpload(song.url);
    removeUpload(song.cover);
    await Post.updateMany({ song: song._id }, { $set: { song: null } });
    await Song.deleteOne({ _id: song._id });
    await log(req.userId, 'remove_song', song.uploader, song.title);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/chains/:id', async (req, res) => {
  try {
    const chain = await Chain.findById(req.params.id);
    if (!chain) return res.status(404).json({ error: 'Chain not found' });
    chain.entries.forEach((e) => removeUpload(e.image));
    await Notification.deleteMany({ chain: chain._id });
    await Chain.deleteOne({ _id: chain._id });
    await log(req.userId, 'remove_chain', chain.owner, chain.title);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- users ----------
router.get('/users', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const filter = {};
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { username: rx }, { email: rx }];
    }
    if (req.query.filter === 'banned') filter.banned = true;
    if (req.query.filter === 'admin') filter.role = 'admin';

    const users = await User.find(filter).select('-password -followers -following -saved').sort({ createdAt: -1 }).limit(50);
    const counts = await Post.aggregate([
      { $match: { author: { $in: users.map((u) => u._id) } } },
      { $group: { _id: '$author', n: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
    res.json(
      users.map((u) => ({
        _id: u._id, name: u.name, username: u.username, email: u.email,
        avatar: u.avatar || '', avatarUrl: u.avatarUrl || '',
        role: u.role, banned: !!u.banned, bannedUntil: u.bannedUntil, banReason: u.banReason,
        warnings: u.warnings || 0, createdAt: u.createdAt, postsCount: countMap.get(String(u._id)) || 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function targetUser(req, res) {
  const u = await User.findById(req.params.id);
  if (!u) { res.status(404).json({ error: 'User not found' }); return null; }
  return u;
}

router.post('/users/:id/warn', async (req, res) => {
  try {
    const u = await targetUser(req, res); if (!u) return;
    const message = String(req.body?.message || '').trim().slice(0, 300);
    if (!message) return res.status(400).json({ error: 'Write the warning message' });
    await User.updateOne({ _id: u._id }, { $inc: { warnings: 1 } });
    await notify({ user: u._id, actor: req.userId, type: 'warning', meta: message });
    await log(req.userId, 'warn_user', u._id, message);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/ban', async (req, res) => {
  try {
    const u = await targetUser(req, res); if (!u) return;
    if (String(u._id) === req.userId) return res.status(400).json({ error: 'You cannot suspend yourself' });
    if (u.role === 'admin') return res.status(400).json({ error: 'Remove admin rights first' });
    const until = await banUser(u, { days: req.body?.days, reason: req.body?.reason });
    await log(req.userId, 'suspend_user', u._id, `${until ? `until ${until.toISOString().slice(0, 10)}` : 'permanent'}: ${req.body?.reason || ''}`);
    res.json({ ok: true, bannedUntil: until });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/unban', async (req, res) => {
  try {
    const u = await targetUser(req, res); if (!u) return;
    await User.updateOne({ _id: u._id }, { $set: { banned: false, bannedUntil: null, banReason: '' } });
    await Post.updateMany({ author: u._id, hiddenReason: 'ban' }, { $set: { hidden: false, hiddenReason: '' } });
    await log(req.userId, 'unsuspend_user', u._id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/role', async (req, res) => {
  try {
    const u = await targetUser(req, res); if (!u) return;
    const role = req.body?.role === 'admin' ? 'admin' : 'user';
    if (String(u._id) === req.userId) return res.status(400).json({ error: 'You cannot change your own role' });
    await User.updateOne({ _id: u._id }, { $set: { role } });
    await log(req.userId, role === 'admin' ? 'make_admin' : 'remove_admin', u._id);
    res.json({ ok: true, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- activity log ----------
router.get('/log', async (req, res) => {
  try {
    const items = await AdminAction.find().sort({ createdAt: -1 }).limit(80)
      .populate('admin', 'username').populate('targetUser', 'username');
    res.json(items.map((a) => ({
      _id: a._id, action: a.action, note: a.note, createdAt: a.createdAt,
      admin: a.admin?.username || 'deleted', target: a.targetUser?.username || null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
