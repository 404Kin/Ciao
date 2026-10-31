import express from 'express';
import Post, { MOODS } from '../models/Post.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import Song from '../models/Song.js';
import Notification from '../models/Notification.js';
import Report, { REPORT_REASONS } from '../models/Report.js';
import { verifyToken as auth } from '../middleware/auth.js';
import { handleUpload, uploadMedia, removeUpload } from '../middleware/upload.js';
import { notify, unnotify } from '../utils/notify.js';
import {
  USER_FIELDS,
  serializePost,
  serializeComment,
  reactionMap,
  extractTags,
  isReaction,
  escapeRegex,
} from '../utils/serialize.js';

const router = express.Router();

const POST_POPULATE = [
  { path: 'author', select: USER_FIELDS },
  { path: 'song', populate: { path: 'uploader', select: USER_FIELDS } },
];

async function savedSetOf(meId) {
  const me = await User.findById(meId).select('saved');
  return new Set((me?.saved || []).map(String));
}

async function loadSerialized(postId, meId) {
  const post = await Post.findById(postId).populate(POST_POPULATE);
  if (!post) return null;
  return serializePost(post, meId, await savedSetOf(meId));
}

// ---------- CREATE ----------
router.post('/', auth, handleUpload(uploadMedia), async (req, res) => {
  const files = req.files || [];
  const cleanup = () => files.forEach((f) => removeUpload(`/uploads/media/${f.filename}`));
  try {
    const text = String(req.body.text || '').trim();
    const mood = MOODS.includes(req.body.mood) ? req.body.mood : 'calm';
    const songId = req.body.songId || null;

    if (!text && !files.length && !songId) {
      cleanup();
      return res.status(400).json({ error: 'Write something or add a photo, video or song' });
    }
    if (text.length > 2000) {
      cleanup();
      return res.status(400).json({ error: 'Post is too long (max 2000 characters)' });
    }

    let song = null;
    if (songId) {
      song = await Song.findById(songId).select('_id');
      if (!song) {
        cleanup();
        return res.status(404).json({ error: 'That song no longer exists' });
      }
    }

    const media = files.map((f) => ({
      url: `/uploads/media/${f.filename}`,
      type: f.mimetype.startsWith('video/') ? 'video' : 'image',
    }));

    const post = await Post.create({
      author: req.userId,
      text,
      media,
      mood,
      tags: extractTags(text),
      song: song ? song._id : null,
    });

    res.status(201).json({ post: await loadSerialized(post._id, req.userId) });
  } catch (err) {
    cleanup();
    console.error('Create post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------- FEED ----------
// scope: all | following | mine | saved | popular | media   (+ user, tag, q, before, limit)
router.get('/', auth, async (req, res) => {
  try {
    const { scope = 'all', user: username, tag, q, before } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);

    const filter = { hidden: { $ne: true } };
    const me = await User.findById(req.userId).select('following saved');
    if (!me) return res.status(401).json({ error: 'Account not found' });

    if (scope === 'following') {
      filter.author = { $in: [...me.following, me._id] };
    } else if (scope === 'mine') {
      filter.author = me._id;
    } else if (scope === 'saved') {
      filter._id = { $in: me.saved };
    } else if (scope === 'media') {
      filter.$or = [{ 'media.0': { $exists: true } }, { image: { $ne: '' } }];
    }

    if (username) {
      const target = await User.findOne({ username: String(username).toLowerCase() }).select('_id');
      if (!target) return res.json({ posts: [], hasMore: false, nextCursor: null });
      filter.author = target._id;
    }
    if (tag) filter.tags = String(tag).replace(/^#/, '').toLowerCase();
    if (q) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.text = rx;
    }
    if (before && scope !== 'popular') {
      const d = new Date(before);
      if (!isNaN(d)) filter.createdAt = { $lt: d };
    }

    const savedSet = new Set(me.saved.map(String));

    if (scope === 'popular') {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const recent = await Post.find({ ...filter, createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(150)
        .populate(POST_POPULATE);
      const score = (p) => reactionMap(p).size + (p.commentsCount || 0) * 2;
      const ranked = recent.sort((a, b) => score(b) - score(a)).slice(0, 20);
      return res.json({
        posts: ranked.map((p) => serializePost(p, req.userId, savedSet)),
        hasMore: false,
        nextCursor: null,
      });
    }

    const found = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate(POST_POPULATE);

    const hasMore = found.length > limit;
    const page = hasMore ? found.slice(0, limit) : found;
    res.json({
      posts: page.map((p) => serializePost(p, req.userId, savedSet)),
      hasMore,
      nextCursor: page.length ? page[page.length - 1].createdAt : null,
    });
  } catch (err) {
    console.error('Feed error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------- TRENDING TAGS (before /:id) ----------
router.get('/trending/tags', auth, async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const tags = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, hidden: { $ne: true } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 8 },
    ]);
    res.json(tags.map((t) => ({ tag: t._id, count: t.count })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- SINGLE POST ----------
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await loadSerialized(req.params.id, req.userId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Post not found' });
    res.status(500).json({ error: err.message });
  }
});

// ---------- EDIT ----------
router.patch('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (String(post.author) !== req.userId) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    const { text, mood } = req.body || {};
    if (text !== undefined) {
      const t = String(text).trim();
      const hasMedia = (post.media || []).length > 0 || !!post.image || !!post.song;
      if (!t && !hasMedia) return res.status(400).json({ error: 'Post cannot be empty' });
      if (t.length > 2000) return res.status(400).json({ error: 'Post is too long' });
      post.text = t;
      post.tags = extractTags(t);
    }
    if (mood && MOODS.includes(mood)) post.mood = mood;
    post.edited = true;
    await post.save();

    res.json({ post: await loadSerialized(post._id, req.userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE ----------
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (String(post.author) !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    (post.media || []).forEach((m) => removeUpload(m.url));
    if (post.image) removeUpload(post.image);

    await Comment.deleteMany({ post: post._id });
    await Notification.deleteMany({ post: post._id });
    await Report.deleteMany({ post: post._id });
    await User.updateMany({ saved: post._id }, { $pull: { saved: post._id } });
    await Post.deleteOne({ _id: post._id });

    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- REACT (like / love / haha / wow / sad / angry) ----------
async function reactHandler(req, res, forcedType) {
  try {
    const type = forcedType || req.body?.type || 'like';
    if (!isReaction(type)) return res.status(400).json({ error: 'Unknown reaction' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // merge legacy likes into reactions (one-time migration per post)
    const map = reactionMap(post);
    const previous = map.get(req.userId);

    let myReaction;
    if (previous === type) {
      map.delete(req.userId); // tapping the same reaction removes it
      myReaction = null;
    } else {
      map.set(req.userId, type);
      myReaction = type;
    }

    post.reactions = [...map.entries()].map(([user, t]) => ({ user, type: t }));
    post.likes = [];
    await post.save();

    if (myReaction) {
      await notify({ user: post.author, actor: req.userId, type: 'reaction', post: post._id, meta: myReaction });
    } else {
      await unnotify({ user: post.author, actor: req.userId, type: 'reaction', post: post._id });
    }

    const counts = {};
    for (const t of map.values()) counts[t] = (counts[t] || 0) + 1;
    res.json({ myReaction, reactionCounts: counts, reactionsTotal: map.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.post('/:id/react', auth, (req, res) => reactHandler(req, res));
// legacy alias from the first version of Ciao
router.post('/:id/like', auth, (req, res) => reactHandler(req, res, 'like'));

// ---------- SAVE / UNSAVE ----------
router.post('/:id/save', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select('_id');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const me = await User.findById(req.userId).select('saved');
    const has = me.saved.some((id) => String(id) === String(post._id));
    await User.updateOne(
      { _id: me._id },
      has ? { $pull: { saved: post._id } } : { $addToSet: { saved: post._id } }
    );
    res.json({ saved: !has });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- REPORT ----------
router.post('/:id/report', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (String(post.author) === req.userId) {
      return res.status(400).json({ error: "You can't report your own post" });
    }

    const reason = REPORT_REASONS.includes(req.body?.reason) ? req.body.reason : 'other';
    const details = String(req.body?.details || '').trim().slice(0, 300);
    try {
      await Report.create({ post: post._id, reporter: req.userId, reason, details });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ error: 'You have already reported this post' });
      throw err;
    }

    // enough independent reports hide the post until an admin has looked at it
    const open = await Report.countDocuments({ post: post._id, status: 'open' });
    post.reportCount = open;
    if (open >= 3 && !post.hidden) {
      post.hidden = true;
      post.hiddenReason = 'reports';
    }
    await post.save();
    res.json({ message: 'Thanks. Our team will review this post.', reportCount: open });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- COMMENTS ----------
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select('author');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comments = await Comment.find({ post: post._id })
      .sort({ createdAt: 1 })
      .populate('author', USER_FIELDS);
    res.json(comments.map((c) => serializeComment(c, req.userId, post.author)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Comment cannot be empty' });
    if (text.length > 500) return res.status(400).json({ error: 'Comment is too long (max 500)' });

    const post = await Post.findById(req.params.id).select('author');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let parentId = null;
    let replyTo = null;
    if (req.body?.parent) {
      const parent = await Comment.findById(req.body.parent);
      if (!parent || String(parent.post) !== String(post._id)) {
        return res.status(400).json({ error: 'The comment you replied to no longer exists' });
      }
      parentId = parent.parent || parent._id; // keep threads one level deep
      replyTo = parent.author;
    }

    const comment = await Comment.create({
      post: post._id,
      author: req.userId,
      text,
      parent: parentId,
    });

    const count = await Comment.countDocuments({ post: post._id });
    await Post.updateOne({ _id: post._id }, { $set: { commentsCount: count } });

    await notify({ user: post.author, actor: req.userId, type: 'comment', post: post._id, meta: text.slice(0, 80) });
    if (replyTo && String(replyTo) !== String(post.author)) {
      await notify({ user: replyTo, actor: req.userId, type: 'reply', post: post._id, meta: text.slice(0, 80) });
    }

    await comment.populate('author', USER_FIELDS);
    res.status(201).json({
      comment: serializeComment(comment, req.userId, post.author),
      commentsCount: count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
