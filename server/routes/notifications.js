import express from 'express';
import Notification from '../models/Notification.js';
import { verifyToken as auth } from '../middleware/auth.js';
import { USER_FIELDS, mediaOf } from '../utils/serialize.js';

const router = express.Router();

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const items = await Notification.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(60)
      .populate('actor', USER_FIELDS)
      .populate('post', 'text media image')
      .populate('chain', 'title');

    res.json(
      items
        .filter((n) => n.actor) // actor may have deleted their account
        .map((n) => {
          const post = n.post
            ? {
                _id: n.post._id,
                text: (n.post.text || '').slice(0, 80),
                thumb: mediaOf(n.post).find((m) => m.type === 'image')?.url || '',
              }
            : null;
          return {
            _id: n._id,
            type: n.type,
            meta: n.meta,
            read: n.read,
            createdAt: n.createdAt,
            actor: {
              _id: n.actor._id,
              name: n.actor.name,
              username: n.actor.username,
              avatar: n.actor.avatar || '',
              avatarUrl: n.actor.avatarUrl || '',
            },
            post,
            chain: n.chain ? { _id: n.chain._id, title: n.chain.title } : null,
          };
        })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.userId, read: false }, { $set: { read: true } });
    res.json({ message: 'All caught up' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications  (clear all)
router.delete('/', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.userId });
    res.json({ message: 'Cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
