import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Post from '../models/Post.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export const isBanned = (u) => !!u?.banned && (!u.bannedUntil || u.bannedUntil.getTime() > Date.now());

export const banMessage = (u) =>
  `Your account is suspended${u.bannedUntil ? ` until ${u.bannedUntil.toLocaleDateString('en-GB')}` : ''}.${
    u.banReason ? ` Reason: ${u.banReason}` : ''
  }`;

// Lift a suspension that has run out
export async function liftIfExpired(u) {
  if (u?.banned && u.bannedUntil && u.bannedUntil.getTime() <= Date.now()) {
    await User.updateOne({ _id: u._id }, { $set: { banned: false, bannedUntil: null, banReason: '' } });
    await Post.updateMany({ author: u._id, hiddenReason: 'ban' }, { $set: { hidden: false, hiddenReason: '' } });
    u.banned = false;
  }
}

// Verifies the token, then checks the account still exists and is not suspended
async function auth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const u = await User.findById(decoded.id).select('role banned bannedUntil banReason');
    if (!u) return res.status(401).json({ error: 'Account not found' });
    await liftIfExpired(u);
    if (isBanned(u)) return res.status(403).json({ error: banMessage(u), code: 'BANNED' });
    req.userId = String(u._id);
    req.user = { id: String(u._id) };
    req.role = u.role;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Same as auth, but never rejects (used for public profile pages)
export function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = String(decoded.id);
      req.user = { id: String(decoded.id) };
    } catch {
      /* ignore bad token */
    }
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}

export const verifyToken = auth;
export default auth;
