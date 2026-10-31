import express from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { verifyToken as auth } from '../middleware/auth.js';
import { handleUpload, uploadMessageImage, removeUpload } from '../middleware/upload.js';
import { USER_FIELDS, serializeUser } from '../utils/serialize.js';

const router = express.Router();
router.use(auth);

const idOf = (x) => String(x?._id || x);

const serializeMessage = (m) => ({
  _id: m._id,
  sender: idOf(m.sender),
  text: m.deleted ? '' : m.text,
  image: m.deleted ? '' : m.image,
  deleted: !!m.deleted,
  read: !!m.read,
  createdAt: m.createdAt,
});

// load a conversation only if the current user is in it
async function mine(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: 'Chat not found' }); return null; }
  const conv = await Conversation.findById(req.params.id).populate('participants', USER_FIELDS);
  if (!conv || !conv.participants.some((p) => idOf(p) === req.userId)) {
    res.status(404).json({ error: 'Chat not found' });
    return null;
  }
  return conv;
}
const otherOf = (conv, me) => serializeUser(conv.participants.find((p) => idOf(p) !== String(me)) || conv.participants[0]);

// ---------- my chats ----------
router.get('/conversations', async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.userId, lastAt: { $ne: null } })
      .sort({ lastAt: -1 })
      .limit(60)
      .populate('participants', USER_FIELDS);
    const counts = await Message.aggregate([
      { $match: { conversation: { $in: convs.map((c) => c._id) }, sender: { $ne: new mongoose.Types.ObjectId(req.userId) }, read: false } },
      { $group: { _id: '$conversation', n: { $sum: 1 } } },
    ]);
    const unread = new Map(counts.map((c) => [String(c._id), c.n]));
    res.json(
      convs.map((c) => ({
        _id: c._id,
        user: otherOf(c, req.userId),
        lastText: c.lastText,
        lastMine: idOf(c.lastSender) === req.userId,
        lastAt: c.lastAt,
        unread: unread.get(String(c._id)) || 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.userId }).select('_id');
    const count = await Message.countDocuments({
      conversation: { $in: convs.map((c) => c._id) },
      sender: { $ne: req.userId },
      read: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- open (or create) a chat with someone ----------
router.post('/conversations', async (req, res) => {
  try {
    const otherId = String(req.body?.userId || '');
    if (!mongoose.isValidObjectId(otherId)) return res.status(400).json({ error: 'Choose someone to message' });
    if (otherId === req.userId) return res.status(400).json({ error: 'You cannot message yourself' });
    const other = await User.findById(otherId).select('_id');
    if (!other) return res.status(404).json({ error: 'User not found' });

    let conv = await Conversation.findOne({ participants: { $all: [req.userId, otherId], $size: 2 } });
    if (!conv) conv = await Conversation.create({ participants: [req.userId, otherId] });
    res.json({ conversation: { _id: conv._id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- messages in a chat (also marks theirs as read) ----------
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const conv = await mine(req, res);
    if (!conv) return;
    await Message.updateMany({ conversation: conv._id, sender: { $ne: req.userId }, read: false }, { $set: { read: true } });
    const msgs = await Message.find({ conversation: conv._id }).sort({ createdAt: -1 }).limit(80);
    res.json({ user: otherOf(conv, req.userId), messages: msgs.reverse().map(serializeMessage) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conversations/:id/messages', handleUpload(uploadMessageImage), async (req, res) => {
  const file = req.file;
  const cleanup = () => file && removeUpload(`/uploads/messages/${file.filename}`);
  try {
    const conv = await mine(req, res);
    if (!conv) { cleanup(); return; }
    const text = String(req.body?.text || '').trim();
    if (!text && !file) { cleanup(); return res.status(400).json({ error: 'Write a message or add a photo' }); }
    if (text.length > 1000) { cleanup(); return res.status(400).json({ error: 'Message is too long (max 1000)' }); }

    const msg = await Message.create({
      conversation: conv._id,
      sender: req.userId,
      text,
      image: file ? `/uploads/messages/${file.filename}` : '',
    });
    conv.lastText = text || 'Photo';
    conv.lastSender = req.userId;
    conv.lastAt = msg.createdAt;
    await conv.save();
    res.status(201).json({ message: serializeMessage(msg) });
  } catch (err) {
    cleanup();
    res.status(500).json({ error: err.message });
  }
});

// ---------- unsend my own message ----------
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Message not found' });
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (String(msg.sender) !== req.userId) return res.status(403).json({ error: 'You can only unsend your own messages' });

    removeUpload(msg.image);
    msg.deleted = true;
    msg.text = '';
    msg.image = '';
    await msg.save();
    const last = await Message.findOne({ conversation: msg.conversation }).sort({ createdAt: -1 });
    if (last && String(last._id) === String(msg._id)) {
      await Conversation.updateOne({ _id: msg.conversation }, { $set: { lastText: 'Message unsent' } });
    }
    res.json({ message: serializeMessage(msg) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
