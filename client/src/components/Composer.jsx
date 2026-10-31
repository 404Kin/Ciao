import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Music, Smile, X, Send, Loader2, Play } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { MOODS, QUICK_EMOJIS } from '../utils/format.js';
import { Avatar, Menu } from './ui.jsx';
import { SongPicker, PostSong } from './music.jsx';


export default function Composer({ onPosted, autoFocus = false, compact = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const [text, setText] = useState('');
  const [mood, setMood] = useState('calm');
  const [files, setFiles] = useState([]); // [{file, url, type}]
  const [song, setSong] = useState(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef(null);
  const area = useRef(null);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), []); // eslint-disable-line
  useEffect(() => { if (autoFocus) area.current?.focus(); }, [autoFocus]);

  // auto-grow textarea
  useEffect(() => {
    const el = area.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 320) + 'px'; }
  }, [text]);

  const addFiles = (list) => {
    const incoming = [...list];
    const room = 4 - files.length;
    if (incoming.length > room) toast.info('You can attach up to 4 photos or videos');
    const next = [];
    for (const f of incoming.slice(0, Math.max(room, 0))) {
      const isImg = f.type.startsWith('image/');
      const isVid = f.type.startsWith('video/');
      if (!isImg && !isVid) { toast.error(`${f.name} isn't a photo or video`); continue; }
      if (f.size > 100 * 1024 * 1024) { toast.error(`${f.name} is larger than 100 MB`); continue; }
      next.push({ file: f, url: URL.createObjectURL(f), type: isVid ? 'video' : 'image' });
    }
    setFiles((p) => [...p, ...next]);
  };

  const removeFile = (i) => {
    setFiles((p) => { URL.revokeObjectURL(p[i].url); return p.filter((_, k) => k !== i); });
  };

  const insertEmoji = (e) => {
    const el = area.current;
    const s = el?.selectionStart ?? text.length;
    const en = el?.selectionEnd ?? text.length;
    setText((t) => t.slice(0, s) + e + t.slice(en));
    setTimeout(() => { el?.focus(); el?.setSelectionRange(s + e.length, s + e.length); }, 0);
  };

  const canPost = (text.trim() || files.length || song) && !busy;

  const submit = async () => {
    if (!canPost) return;
    const fd = new FormData();
    fd.append('text', text.trim());
    fd.append('mood', mood);
    if (song) fd.append('songId', song._id);
    files.forEach((f) => fd.append('media', f.file));
    setBusy(true);
    setProgress(0);
    try {
      const { data } = await api.post('/posts', fd, {
        onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)),
      });
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setText(''); setFiles([]); setSong(null); setMood('calm');
      toast.success('Posted');
      onPosted?.(data.post);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${compact ? '' : 'card p-4'}`}>
      <div className={compact ? '' : 'flex gap-3'}>
        {compact ? (
          <div className="flex items-center gap-3 mb-2">
            <Avatar user={user} size={40} />
            <div className="min-w-0"><p className="font-semibold text-sm leading-tight truncate">{user?.name}</p><p className="text-xs text-muted truncate">@{user?.username}</p></div>
          </div>
        ) : <Avatar user={user} size={44} />}
        <div className="flex-1 min-w-0">
          <textarea
            ref={area} value={text} onChange={(e) => setText(e.target.value)} rows={compact ? 5 : 2} maxLength={2000}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit(); }}
            placeholder={`What's on your mind, ${user?.name?.split(' ')[0] || 'friend'}?`}
            className={`w-full bg-transparent resize-none outline-none text-[16px] placeholder:text-muted ${compact ? 'min-h-[120px]' : 'pt-2'}`}
          />

          {files.length > 0 && (
            <div className={`grid gap-2 mt-2 ${files.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {files.map((f, i) => (
                <div key={f.url} className="relative rounded-2xl overflow-hidden border border-line bg-surface2">
                  {f.type === 'video'
                    ? <video src={f.url} className="w-full max-h-64 object-cover" muted playsInline />
                    : <img src={f.url} alt="" className="w-full max-h-64 object-cover" />}
                  {f.type === 'video' && <span className="absolute left-2 bottom-2 chip !bg-black/60 !text-white !border-0"><Play size={11} /> Video</span>}
                  <button onClick={() => removeFile(i)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/65 text-white grid place-items-center hover:bg-black/85" aria-label="Remove attachment">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {song && <div className="mt-2"><PostSong song={song} onRemove={() => setSong(null)} /></div>}

          {busy && files.length > 0 && (
            <div className="mt-3 h-1.5 rounded-full bg-surface2 overflow-hidden"><div className="h-full gradient-accent transition-all" style={{ width: `${progress}%` }} /></div>
          )}

          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-line">
            <input ref={fileInput} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <button className="icon-btn !text-accent" onClick={() => fileInput.current?.click()} disabled={files.length >= 4} aria-label="Add photo or video" title="Photo / video">
              <ImagePlus size={20} />
            </button>
            <button className={`icon-btn ${song ? '!text-accent' : '!text-accent'}`} onClick={() => setPicker(true)} aria-label="Add a song" title="Song">
              <Music size={20} />
            </button>
            <Menu align="left" width="w-64" trigger={<button className="icon-btn !text-accent" aria-label="Emoji" title="Emoji"><Smile size={20} /></button>}>
              <div className="grid grid-cols-6 gap-1 p-1" onClick={(e) => e.stopPropagation()}>
                {QUICK_EMOJIS.map((e) => (
                  <button key={e} className="text-xl h-9 rounded-lg hover:bg-surface2" onClick={() => insertEmoji(e)}>{e}</button>
                ))}
              </div>
            </Menu>
            <Menu align="left" width="w-44" trigger={
              <button className="chip hover:text-ink transition ml-1" aria-label="Choose mood">{MOODS[mood].emoji} {MOODS[mood].label}</button>}>
              {Object.entries(MOODS).map(([k, v]) => (
                <button key={k} onClick={() => setMood(k)} className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm hover:bg-surface2 ${mood === k ? 'text-accent font-semibold' : ''}`}>
                  <span>{v.emoji}</span> {v.label}
                </button>
              ))}
            </Menu>
            <span className={`ml-auto mr-2 text-xs tabular-nums ${text.length > 1900 ? 'text-danger' : 'text-muted'}`}>{text.length > 0 ? `${text.length}/2000` : ''}</span>
            <button className="btn-primary btn-sm" onClick={submit} disabled={!canPost}>
              {busy ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Post
            </button>
          </div>
        </div>
      </div>
      <SongPicker open={picker} onClose={() => setPicker(false)} onSelect={setSong} selectedId={song?._id} />
    </div>
  );
}
