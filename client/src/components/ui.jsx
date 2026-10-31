import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, ArrowLeft, Bell, Bookmark, Music, Heart, FileText, Image as ImageIcon, Search, UserX, Link2, Layers, WifiOff, Flame, Sparkles, Users, Lock, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mediaUrl } from '../utils/api.js';
import { gradientFor } from '../utils/format.js';
import { presetUrl } from '../utils/avatars.js';

/* ---------- Avatar ---------- */
// photo upload  >  avatar image from the app's avatar folder  >  legacy emoji  >  initial letter
export function Avatar({ user, size = 40, className = '', ring = false }) {
  const style = { width: size, height: size, minWidth: size, fontSize: size * 0.5 };
  const base = `rounded-full overflow-hidden grid place-items-center shrink-0 select-none ${
    ring ? 'ring-2 ring-accent/60 ring-offset-2 ring-offset-bg' : ''
  } ${className}`;
  const src = user?.avatarUrl ? mediaUrl(user.avatarUrl) : presetUrl(user?.avatar);
  if (src) {
    return (
      <span className={base} style={style}>
        {/* object-top: keep the head in frame for tall photos */}
        <img src={src} alt={user?.name || ''} className="w-full h-full object-cover object-[center_20%]" loading="lazy" />
      </span>
    );
  }
  const emoji = user?.avatar && !user.avatar.startsWith('preset:') ? user.avatar : '';
  return (
    <span className={`${base} text-white font-bold`} style={{ ...style, background: gradientFor(user?.username || user?.name || '') }}>
      <span style={{ lineHeight: 1 }}>{emoji || (user?.name || user?.username || '?').trim().charAt(0).toUpperCase()}</span>
    </span>
  );
}

/* ---------- Spinner / empty / skeleton ---------- */
export const Spinner = ({ size = 20, className = '' }) => (
  <Loader2 size={size} className={`spin text-accent ${className}`} />
);

const EMPTY_ICONS = {
  bell: Bell, bookmark: Bookmark, music: Music, heart: Heart, file: FileText, image: ImageIcon, search: Search,
  user: UserX, link: Link2, layers: Layers, wifi: WifiOff, flame: Flame, sparkles: Sparkles, users: Users, lock: Lock, inbox: Inbox,
};

// Neutral circular icon, not an emoji. Old callers that still pass `emoji` get a sensible icon.
const EMOJI_TO_ICON = {
  '🔔': 'bell', '🔖': 'bookmark', '🎧': 'music', '💜': 'heart', '📝': 'file', '📷': 'image', '🔎': 'search',
  '🫥': 'user', '🙈': 'user', '🔗': 'link', '📚': 'layers', '📡': 'wifi', '🌱': 'flame', '✨': 'sparkles', '🫶': 'users', '🔒': 'lock',
};

export function EmptyState({ icon, emoji, title, text, action }) {
  const Icon = EMPTY_ICONS[icon || EMOJI_TO_ICON[emoji] || 'inbox'] || Inbox;
  return (
    <div className="py-14 px-6 text-center">
      <div className="w-16 h-16 rounded-full border-2 border-ink/80 grid place-items-center mx-auto mb-4"><Icon size={28} strokeWidth={1.6} /></div>
      <h3 className="font-bold text-lg">{title}</h3>
      {text && <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PostSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex gap-3 items-center">
        <div className="skeleton w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton h-3 w-1/5" />
        </div>
      </div>
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-4/5" />
      <div className="skeleton h-48 w-full" />
    </div>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({ title, subtitle, back = false, right }) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-line">
      <div className="flex items-center gap-3 px-4 h-14">
        {back && (
          <button className="icon-btn -ml-2" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-lg leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted truncate -mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[rise_.15s_ease-out]" onClick={onClose} />
      <div
        className={`relative w-full ${width} max-h-[92vh] flex flex-col bg-surface border border-line shadow-card
                    rounded-t-2xl sm:rounded-2xl animate-rise safe-bottom`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h2 className="font-bold text-base">{title}</h2>
          <button className="icon-btn -mr-2" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ---------- Confirm dialog (promise based) ---------- */
const ConfirmContext = createContext(null);
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback(
    (opts) => new Promise((resolve) => setState({ ...opts, resolve })),
    []
  );
  const close = (v) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title || 'Are you sure?'} size="sm">
        <p className="text-sm text-muted">{state?.message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost btn-sm" onClick={() => close(false)}>
            Cancel
          </button>
          <button className={`${state?.danger ? 'btn-danger' : 'btn-primary'} btn-sm`} onClick={() => close(true)} autoFocus>
            {state?.confirmText || 'Confirm'}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmContext);

/* ---------- Dropdown menu ---------- */
export function Menu({ trigger, children, align = 'right', width = 'w-52' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div
          className={`absolute z-40 mt-1 ${width} ${align === 'right' ? 'right-0' : 'left-0'} card shadow-card p-1.5 animate-pop origin-top-right`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
export const MenuItem = ({ icon: Icon, children, danger, onClick, ...rest }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left transition hover:bg-surface2 ${
      danger ? 'text-danger' : ''
    }`}
    {...rest}
  >
    {Icon && <Icon size={16} />} {children}
  </button>
);

/* ---------- Lightbox ---------- */
export function Lightbox({ items, index, onClose, onIndex }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [index, items.length, onClose, onIndex]);

  const item = items[index];
  if (!item) return null;
  return createPortal(
    <div className="fixed inset-0 z-[95] bg-black/92 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 icon-btn !text-white bg-white/10 hover:bg-white/20" onClick={onClose} aria-label="Close">
        <X size={20} />
      </button>
      {items.length > 1 && (
        <>
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 icon-btn !text-white bg-white/10 hover:bg-white/20 !w-11 !h-11"
            onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + items.length) % items.length); }}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn !text-white bg-white/10 hover:bg-white/20 !w-11 !h-11"
            onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % items.length); }}
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}
      <div onClick={(e) => e.stopPropagation()} className="max-w-[94vw] max-h-[90vh]">
        {item.type === 'video' ? (
          <video src={mediaUrl(item.url)} controls autoPlay playsInline className="max-w-[94vw] max-h-[90vh] rounded-xl" />
        ) : (
          <img src={mediaUrl(item.url)} alt="" className="max-w-[94vw] max-h-[90vh] object-contain rounded-xl" />
        )}
      </div>
      {items.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-xs bg-black/50 rounded-full px-3 py-1">
          {index + 1} / {items.length}
        </div>
      )}
    </div>,
    document.body
  );
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex border-b border-line ${className}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`relative flex-1 py-3 text-sm font-semibold transition hover:bg-surface2/60 ${
            value === t.id ? 'text-ink' : 'text-muted'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {t.icon && <t.icon size={15} />}
            {t.label}
          </span>
          {value === t.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-12 rounded-full gradient-accent" />}
        </button>
      ))}
    </div>
  );
}
