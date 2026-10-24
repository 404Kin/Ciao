import express from 'express';
import mongoose from 'mongoose';
import Chain from '../models/Chain.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { verifyToken as auth } from '../middleware/auth.js';
import { handleUpload, uploadChainImage, removeUpload } from '../middleware/upload.js';
import { notify } from '../utils/notify.js';
import { USER_FIELDS, serializeUser } from '../utils/serialize.js';

const router = express.Router();
const POPULATE = [
  { path: 'owner', select: USER_FIELDS },
  { path: 'invited', select: USER_FIELDS },
  { path: 'entries.user', select: USER_FIELDS },
];
const idOf = (x) => String(x?._id || x);

function serializeChain(c, meId) {
  const o = c.toObject ? c.toObject() : c;
  const contributed = new Set((o.entries || []).map((e) => idOf(e.user)));
  const invited = (o.invited || []).map((u) => ({ ...serializeUser(u), done: contributed.has(idOf(u)) }));
  const me = String(meId);
  return {
    _id: o._id,
    title: o.title,
    status: o.status,
    owner: serializeUser(o.owner),
    isOwner: idOf(o.owner) === me,
    invited,
    pendingCount: invited.filter((u) => !u.done).length,
    entries: (o.entries || []).map((e) => ({
      _id: e._id,
      user: serializeUser(e.user),
      text: e.text || '',
      image: e.image || '',
      createdAt: e.createdAt,
    })),
    myTurn: o.status === 'open' && invited.some((u) => String(u._id) === me && !u.done),
    createdAt: o.createdAt,
    completedAt: o.completedAt,
  };
}

const load = (id) => Chain.findById(id).populate(POPULATE);
const isParticipant = (c, meId) =>
  idOf(c.owner) === String(meId) || (c.invited || []).some((u) => idOf(u) === String(meId));

function parseInvited(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { list = raw.split(','); }
  }
  if (!Array.isArray(list)) list = list ? [list] : [];
  return [...new Set(list.map((x) => String(x).trim()).filter((x) => mongoose.isValidObjectId(x)))];
}

// ---------- LIST ----------
// scope: turn (waiting for me) | mine (I started, open) | done | all
router.get('/', auth, async (req, res) => {
  try {
    const me = req.userId;
    const involved = { $or: [{ owner: me }, { invited: me }] };
    const filters = {
      turn: { status: 'open', invited: me, 'entries.user': { $ne: me } },
      mine: { owner: me, status: 'open' },
      done: { ...involved, status: 'done' },
      all: involved,
    };
    const chains = await Chain.find(filters[req.query.scope] || filters.all)
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate(POPULATE);
    res.json(chains.map((c) => serializeChain(c, me)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// number of chains waiting for me (for the badge)
router.get('/turn-count', auth, async (req, res) => {
  try {
    const count = await Chain.countDocuments({ status: 'open', invited: req.userId, 'entries.user': { $ne: req.userId } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- CREATE ----------
router.post('/', auth, handleUpload(uploadChainImage), async (req, res) => {
  const file = req.file;
  const cleanup = () => file && removeUpload(`/uploads/chains/${file.filename}`);
  try {
    const title = String(req.body.title || '').trim();
    const text = String(req.body.text || '').trim();
    if (!title) { cleanup(); return res.status(400).json({ error: 'Give your chain a title' }); }
    if (title.length > 80) { cleanup(); return res.status(400).json({ error: 'Title is too long (max 80)' }); }
    if (text.length > 140) { cleanup(); return res.status(400).json({ error: 'Keep your line under 140 characters' }); }
    if (!text && !file) { cleanup(); return res.status(400).json({ error: 'Start the chain with a photo or a line' }); }

    const ids = parseInvited(req.body.invited).filter((id) => id !== String(req.userId));
    if (!ids.length) { cleanup(); return res.status(400).json({ error: 'Tag at least one person' }); }
    if (ids.length > 20) { cleanup(); return res.status(400).json({ error: 'You can tag up to 20 people' }); }
    const users = await User.find({ _id: { $in: ids } }).select('_id');
    if (users.length !== ids.length) { cleanup(); return res.status(400).json({ error: 'Some tagged people no longer exist' }); }

    const chain = await Chain.create({
      owner: req.userId,
      title,
      invited: ids,
      entries: [{ user: req.userId, text, image: file ? `/uploads/chains/${file.filename}` : '' }],
    });

    for (const id of ids) {
      await notify({ user: id, actor: req.userId, type: 'chain_invite', chain: chain._id, meta: title });
    }
    res.status(201).json({ chain: serializeChain(await load(chain._id), req.userId) });
  } catch (err) {
    cleanup();
    console.error('Create chain error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ONE CHAIN (participants only) ----------
router.get('/:id', auth, async (req, res) => {
  try {
    const chain = await load(req.params.id);
    if (!chain) return res.status(404).json({ error: 'Chain not found' });
    if (!isParticipant(chain, req.userId)) return res.status(403).json({ error: 'This chain is private to the people tagged in it' });
    res.json(serializeChain(chain, req.userId));
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Chain not found' });
    res.status(500).json({ error: err.message });
  }
});

// ---------- ADD MY PIECE (one per tagged person) ----------
router.post('/:id/entries', auth, handleUpload(uploadChainImage), async (req, res) => {
  const file = req.file;
  const cleanup = () => file && removeUpload(`/uploads/chains/${file.filename}`);
  try {
    const text = String(req.body.text || '').trim();
    if (text.length > 140) { cleanup(); return res.status(400).json({ error: 'Keep your line under 140 characters' }); }
    if (!text && !file) { cleanup(); return res.status(400).json({ error: 'Add a photo or a line' }); }

    const chain = await Chain.findById(req.params.id);
    if (!chain) { cleanup(); return res.status(404).json({ error: 'Chain not found' }); }
    if (!chain.invited.some((u) => String(u) === req.userId)) {
      cleanup();
      return res.status(403).json({ error: 'Only people tagged in this chain can add to it' });
    }
    if (chain.status !== 'open') { cleanup(); return res.status(400).json({ error: 'This chain is already finished' }); }
    if (chain.entries.some((e) => String(e.user) === req.userId)) {
      cleanup();
      return res.status(400).json({ error: 'You already added your piece' });
    }

    chain.entries.push({ user: req.userId, text, image: file ? `/uploads/chains/${file.filename}` : '' });
    const everyoneDone = chain.invited.every((u) => chain.entries.some((e) => String(e.user) === String(u)));
    if (everyoneDone) {
      chain.status = 'done';
      chain.completedAt = new Date();
    }
    await chain.save();

    await notify({ user: chain.owner, actor: req.userId, type: 'chain_add', chain: chain._id, meta: chain.title });
    if (everyoneDone) {
      const everyone = [chain.owner, ...chain.invited];
      for (const u of everyone) await notify({ user: u, actor: req.userId, type: 'chain_done', chain: chain._id, meta: chain.title });
    }
    res.status(201).json({ chain: serializeChain(await load(chain._id), req.userId) });
  } catch (err) {
    cleanup();
    res.status(500).json({ error: err.message });
  }
});

// ---------- FINISH NOW (owner) ----------
router.post('/:id/finish', auth, async (req, res) => {
  try {
    const chain = await Chain.findById(req.params.id);
    if (!chain) return res.status(404).json({ error: 'Chain not found' });
    if (String(chain.owner) !== req.userId) return res.status(403).json({ error: 'Only the person who started it can finish it' });
    if (chain.status === 'done') return res.json({ chain: serializeChain(await load(chain._id), req.userId) });

    chain.status = 'done';
    chain.completedAt = new Date();
    await chain.save();
    for (const u of chain.invited) await notify({ user: u, actor: req.userId, type: 'chain_done', chain: chain._id, meta: chain.title });
    res.json({ chain: serializeChain(await load(chain._id), req.userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE (owner) ----------
router.delete('/:id', auth, async (req, res) => {
  try {
    const chain = await Chain.findById(req.params.id);
    if (!chain) return res.status(404).json({ error: 'Chain not found' });
    if (String(chain.owner) !== req.userId) return res.status(403).json({ error: 'Only the person who started it can delete it' });
    chain.entries.forEach((e) => removeUpload(e.image));
    await Notification.deleteMany({ chain: chain._id });
    await Chain.deleteOne({ _id: chain._id });
    res.json({ message: 'Chain deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
