import { REACTIONS } from '../models/Post.js';

export const USER_FIELDS = 'name username avatar avatarUrl';
const VIDEO_RE = /\.(mp4|webm|mov|m4v|ogv)$/i;

export function mediaOf(post) {
  const list = (post.media || []).map((m) => ({ url: m.url, type: m.type }));
  if (!list.length && post.image) {
    list.push({ url: post.image, type: VIDEO_RE.test(post.image) ? 'video' : 'image' });
  }
  return list;
}

// Merge new-style reactions with legacy "likes" into { userId: type }
export function reactionMap(post) {
  const map = new Map();
  for (const id of post.likes || []) map.set(String(id), 'like');
  for (const r of post.reactions || []) map.set(String(r.user), r.type);
  return map;
}

export function serializeUser(u) {
  if (!u) return null;
  const o = u.toObject ? u.toObject() : u;
  return {
    _id: o._id,
    name: o.name,
    username: o.username,
    avatar: o.avatar || '',
    avatarUrl: o.avatarUrl || '',
  };
}

export function serializeSong(s, meId) {
  if (!s) return null;
  const o = s.toObject ? s.toObject() : s;
  const uploaderId = o.uploader?._id ? String(o.uploader._id) : o.uploader ? String(o.uploader) : null;
  return {
    _id: o._id,
    title: o.title,
    artist: o.artist,
    url: o.url,
    cover: o.cover || '',
    duration: o.duration || 0,
    isDemo: !!o.isDemo,
    external: !!o.external,
    plays: o.plays || 0,
    likesCount: (o.likes || []).length,
    liked: meId ? (o.likes || []).some((id) => String(id) === String(meId)) : false,
    uploader: o.uploader && o.uploader.username ? serializeUser(o.uploader) : null,
    uploaderId,
    mine: !!meId && !!uploaderId && uploaderId === String(meId),
    createdAt: o.createdAt,
  };
}

export function serializePost(post, meId, savedSet) {
  const o = post.toObject ? post.toObject() : post;
  const map = reactionMap(o);
  const counts = {};
  for (const t of map.values()) counts[t] = (counts[t] || 0) + 1;

  const authorObj = o.author && o.author.username ? serializeUser(o.author) : null;
  const authorId = String(o.author?._id || o.author);

  return {
    _id: o._id,
    author: authorObj,
    authorId,
    text: o.text || '',
    media: mediaOf(o),
    mood: o.mood,
    tags: o.tags || [],
    song: o.song && o.song.title ? serializeSong(o.song, meId) : null,
    reactionCounts: counts,
    reactionsTotal: map.size,
    myReaction: meId ? map.get(String(meId)) || null : null,
    commentsCount: o.commentsCount || 0,
    saved: savedSet ? savedSet.has(String(o._id)) : false,
    mine: meId ? authorId === String(meId) : false,
    edited: !!o.edited,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export function serializeComment(c, meId, postAuthorId) {
  const o = c.toObject ? c.toObject() : c;
  const authorId = String(o.author?._id || o.author);
  return {
    _id: o._id,
    post: String(o.post),
    parent: o.parent ? String(o.parent) : null,
    text: o.text,
    author: o.author && o.author.username ? serializeUser(o.author) : null,
    likesCount: (o.likes || []).length,
    liked: meId ? (o.likes || []).some((id) => String(id) === String(meId)) : false,
    mine: meId ? authorId === String(meId) : false,
    canDelete: meId ? authorId === String(meId) || String(postAuthorId) === String(meId) : false,
    createdAt: o.createdAt,
  };
}

export function extractTags(text = '') {
  const found = text.match(/#[\p{L}\p{N}_]{2,30}/gu) || [];
  return [...new Set(found.map((t) => t.slice(1).toLowerCase()))].slice(0, 10);
}

export const isReaction = (t) => REACTIONS.includes(t);

export const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
