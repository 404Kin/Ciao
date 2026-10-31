import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Check, X, Trash2, Palette } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

// Templates users can pick from on the login / register screens.
// image: file inside /public   |   css: generated background
export const BACKGROUNDS = [
  { id: 'town', name: 'Cozy Town', image: '/pic.webp' },
  { id: 'dreamer', name: 'Dreamer', image: '/pic3.jpg' },
  { id: 'collage', name: 'Collage', image: '/pic5.jpg' },
  { id: 'cube', name: 'Cube', image: '/pic2.jpg', color: '#000' },
  {
    id: 'aurora', name: 'Aurora',
    css: 'radial-gradient(60% 50% at 20% 20%, #7c3aed 0%, transparent 60%), radial-gradient(50% 60% at 80% 30%, #06b6d4 0%, transparent 60%), radial-gradient(60% 60% at 50% 90%, #22c55e55 0%, transparent 60%), #0b0b1a',
  },
  {
    id: 'sunset', name: 'Sunset',
    css: 'linear-gradient(160deg, #1e1b4b 0%, #7c3aed 30%, #ec4899 60%, #fb923c 85%, #fde68a 100%)',
  },
  {
    id: 'ocean', name: 'Ocean',
    css: 'radial-gradient(70% 50% at 70% 10%, #38bdf8aa 0%, transparent 60%), linear-gradient(180deg, #0c4a6e 0%, #0e7490 50%, #042f2e 100%)',
  },
  {
    id: 'midnight', name: 'Midnight',
    css: 'radial-gradient(40% 40% at 80% 20%, #6366f155 0%, transparent 70%), radial-gradient(50% 50% at 10% 90%, #ec489933 0%, transparent 70%), #0b0b14',
  },
];
const DEFAULT_ID = 'sunset';
const KEY = 'ciao_auth_bg';
const CUSTOM_KEY = 'ciao_auth_bg_custom';

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

export function useAuthBackground() {
  const [id, setId] = useState(() => safeGet(KEY) || DEFAULT_ID);
  const [custom, setCustom] = useState(() => safeGet(CUSTOM_KEY));

  const choose = (next) => {
    setId(next);
    try { localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
  };
  const setCustomImage = (dataUrl) => {
    try {
      localStorage.setItem(CUSTOM_KEY, dataUrl);
      localStorage.setItem(KEY, 'custom');
    } catch {
      return false; // too big for storage
    }
    setCustom(dataUrl);
    setId('custom');
    return true;
  };
  const clearCustom = () => {
    try { localStorage.removeItem(CUSTOM_KEY); } catch { /* ignore */ }
    setCustom(null);
    choose(DEFAULT_ID);
  };

  let active = BACKGROUNDS.find((b) => b.id === id);
  if (id === 'custom' && custom) active = { id: 'custom', name: 'My picture', image: custom };
  if (!active) active = BACKGROUNDS.find((b) => b.id === DEFAULT_ID);
  return { active, custom, choose, setCustomImage, clearCustom };
}

// resize a picked image so it fits comfortably in localStorage
export function toDataUrl(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}

const layerStyle = (bg) =>
  bg.image
    ? { backgroundColor: bg.color || '#111', backgroundImage: `url(${bg.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: bg.css };

/* Full-screen background + readability overlay */
export function AuthBackdrop({ bg }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0b0b14]" aria-hidden>
      <div key={bg.id} className="absolute inset-[-4%] auth-bg-anim" style={layerStyle(bg)} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/65" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 45%, transparent 0%, rgba(0,0,0,.45) 100%)' }} />
    </div>
  );
}

/* "Change background" button + panel */
export function BackgroundPicker({ state }) {
  const { active, custom, choose, setCustomImage, clearCustom } = state;
  const [open, setOpen] = useState(false);
  const file = useRef(null);
  const ref = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const onFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Please choose an image');
    try {
      const url = await toDataUrl(f);
      if (!setCustomImage(url)) toast.error('That picture is too big to save in this browser');
      else toast.success('Background changed');
    } catch { toast.error('Could not read that image'); }
  };

  const thumb = (b) => (b.image ? { backgroundImage: `url(${b.image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: b.color || '#222' } : { background: b.css });

  return (
    <div ref={ref} className="fixed z-20 bottom-4 right-4 sm:bottom-6 sm:right-6">
      {open && (
        <div className="absolute bottom-14 right-0 w-[min(92vw,340px)] rounded-3xl p-4 bg-black/70 backdrop-blur-2xl border border-white/15 text-white shadow-2xl animate-pop origin-bottom-right">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Choose your background</h3>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full grid place-items-center hover:bg-white/10" aria-label="Close"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {BACKGROUNDS.map((b) => (
              <button key={b.id} onClick={() => choose(b.id)} aria-pressed={active.id === b.id} title={b.name}
                className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition hover:scale-[1.04] ${active.id === b.id ? 'border-white' : 'border-white/15'}`} style={thumb(b)}>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent text-[10px] font-semibold px-1.5 pt-3 pb-1 text-left">{b.name}</span>
                {active.id === b.id && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white text-black grid place-items-center"><Check size={12} /></span>}
              </button>
            ))}
            {custom && (
              <button onClick={() => choose('custom')} aria-pressed={active.id === 'custom'} title="My picture"
                className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition hover:scale-[1.04] ${active.id === 'custom' ? 'border-white' : 'border-white/15'}`} style={thumb({ image: custom })}>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent text-[10px] font-semibold px-1.5 pt-3 pb-1 text-left">My picture</span>
                {active.id === 'custom' && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white text-black grid place-items-center"><Check size={12} /></span>}
              </button>
            )}
          </div>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="flex gap-2 mt-3">
            <button onClick={() => file.current?.click()} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-white text-black text-sm font-semibold py-2 hover:bg-white/90 active:scale-[.98] transition">
              <ImagePlus size={15} /> Use my own picture
            </button>
            {custom && (
              <button onClick={clearCustom} className="w-10 rounded-full bg-white/10 grid place-items-center hover:bg-white/20" aria-label="Remove my picture" title="Remove my picture"><Trash2 size={15} /></button>
            )}
          </div>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-xl border border-white/20 text-white text-sm font-semibold px-4 py-2.5 hover:bg-black/60 active:scale-[.97] transition shadow-lg">
        <Palette size={16} /> <span className="hidden sm:inline">Change background</span><span className="sm:hidden">Background</span>
      </button>
    </div>
  );
}
