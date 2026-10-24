export function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d > 330 ? 'numeric' : undefined });
}

export function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const compact = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n || 0);

export const MOODS = {
  happy: { emoji: '😊', label: 'Happy' },
  sad: { emoji: '😢', label: 'Sad' },
  excited: { emoji: '🤩', label: 'Excited' },
  thoughtful: { emoji: '🤔', label: 'Thoughtful' },
  grateful: { emoji: '🙏', label: 'Grateful' },
  angry: { emoji: '😠', label: 'Angry' },
  calm: { emoji: '😌', label: 'Calm' },
  love: { emoji: '🥰', label: 'In love' },
};

export const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-400' },
  { type: 'love', emoji: '❤️', label: 'Love', color: 'text-rose-500' },
  { type: 'haha', emoji: '😂', label: 'Haha', color: 'text-amber-400' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-amber-400' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-amber-400' },
  { type: 'angry', emoji: '😡', label: 'Angry', color: 'text-orange-500' },
];
export const reactionOf = (type) => REACTIONS.find((r) => r.type === type);

// Deterministic gradient for songs / avatars without a picture
export function gradientFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${h} 75% 55%), hsl(${(h + 55) % 360} 80% 45%))`;
}
