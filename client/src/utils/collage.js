import { mediaUrl } from './api.js';

const GRADS = [
  ['#8b5cf6', '#ec4899'], ['#06b6d4', '#6366f1'], ['#f97316', '#ef4444'],
  ['#10b981', '#84cc16'], ['#3b82f6', '#a855f7'], ['#ec4899', '#fb923c'],
];
export const gradFor = (i) => GRADS[i % GRADS.length];
export const gradCss = (i) => `linear-gradient(135deg, ${gradFor(i)[0]}, ${gradFor(i)[1]})`;

const loadImg = (url) =>
  new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = mediaUrl(url);
  });

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// Draws the finished chain as one picture (3-column collage) and returns a JPEG blob
export async function renderCollageBlob(chain) {
  const W = 1080, PAD = 40, GAP = 14, COLS = 3;
  const tw = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const tiles = await Promise.all(
    chain.entries.map(async (e) => ({ e, img: e.image ? await loadImg(e.image) : null }))
  );

  // layout: always drop the next tile into the shortest column
  const cols = Array(COLS).fill(0);
  const placed = tiles.map((t, i) => {
    let h = tw;
    if (t.img) h = Math.min(tw * 1.5, Math.max(tw * 0.75, (tw * t.img.height) / t.img.width));
    const c = cols.indexOf(Math.min(...cols));
    const x = PAD + c * (tw + GAP);
    const y = 150 + cols[c];
    cols[c] += h + GAP;
    return { ...t, x, y, h, i };
  });
  const H = 150 + Math.max(...cols) + PAD + 40;

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#14121f'); bg.addColorStop(1, '#241a33');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.font = '800 54px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textBaseline = 'alphabetic';
  let title = chain.title;
  while (ctx.measureText(title).width > W - PAD * 2 && title.length > 4) title = title.slice(0, -2);
  ctx.fillText(title === chain.title ? title : `${title}…`, PAD, 88);
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.font = '500 26px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`A chain story by ${chain.entries.length} people`, PAD, 126);

  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
  for (const t of placed) {
    ctx.save();
    rr(t.x, t.y, tw, t.h, 22); ctx.clip();
    if (t.img) {
      const s = Math.max(tw / t.img.width, t.h / t.img.height);
      const dw = t.img.width * s, dh = t.img.height * s;
      ctx.drawImage(t.img, t.x + (tw - dw) / 2, t.y + (t.h - dh) / 2, dw, dh);
    } else {
      const [a, b] = gradFor(t.i);
      const g = ctx.createLinearGradient(t.x, t.y, t.x + tw, t.y + t.h);
      g.addColorStop(0, a); g.addColorStop(1, b);
      ctx.fillStyle = g; ctx.fillRect(t.x, t.y, tw, t.h);
    }
    const txt = t.e.text;
    if (txt) {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      const size = t.img ? 24 : txt.length > 60 ? 28 : 36;
      ctx.font = `700 ${size}px "Plus Jakarta Sans", system-ui, sans-serif`;
      const lines = wrap(ctx, txt, tw - 48).slice(0, t.img ? 3 : 7);
      const lh = size * 1.25;
      if (t.img) {
        const boxH = lines.length * lh + 70;
        const grad = ctx.createLinearGradient(0, t.y + t.h - boxH, 0, t.y + t.h);
        grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,.75)');
        ctx.fillStyle = grad; ctx.fillRect(t.x, t.y + t.h - boxH, tw, boxH);
        ctx.fillStyle = '#fff';
        lines.forEach((l, k) => ctx.fillText(l, t.x + tw / 2, t.y + t.h - 52 - (lines.length - 1 - k) * lh));
      } else {
        const start = t.y + (t.h - lines.length * lh) / 2 + size * 0.85 - 12;
        lines.forEach((l, k) => ctx.fillText(l, t.x + tw / 2, start + k * lh));
      }
    }
    // who added it
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(t.x, t.y + t.h - 38, tw, 38);
    ctx.fillStyle = '#fff';
    ctx.font = '600 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`@${t.e.user?.username || 'someone'}`, t.x + 16, t.y + t.h - 13);
    ctx.restore();
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Made on Ciao', W - PAD, H - 24);

  return new Promise((resolve, reject) => cv.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not build the picture'))), 'image/jpeg', 0.9));
}
