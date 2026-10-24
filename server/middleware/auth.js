import jwt from 'jsonwebtoken';

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function auth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = String(decoded.id);
    req.user = { id: String(decoded.id) };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
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

export const verifyToken = auth;
export default auth;
