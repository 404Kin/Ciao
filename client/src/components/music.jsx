import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ListMusic,
  Music, X, Heart, Trash2, ListPlus, Upload, ImagePlus, Search, Check, Loader2, FileAudio, Link2,
} from 'lucide-react';
import api, { errMsg, mediaUrl } from '../utils/api.js';
import { useMusic } from '../context/MusicContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fmtTime, gradientFor } from '../utils/format.js';
import { Modal, Spinner, useConfirm } from './ui.jsx';

/* ---------- small pieces ---------- */
export function SongCover({ song, size = 44, rounded = 'rounded-xl', className = '' }) {
  const style = { width: size, height: size, minWidth: size };
  if (song?.cover) {
    return <img src={mediaUrl(song.cover)} alt="" style={style} className={`${rounded} object-cover ${className}`} />;
  }
  return (
    <div style={{ ...style, background: gradientFor(song?.title || '') }} className={`${rounded} grid place-items-center text-white/90 ${className}`}>
      <Music size={Math.max(14, size * 0.42)} />
    </div>
  );
}

export function Equalizer({ active = true, className = '' }) {
  return (
    <span className={`inline-flex items-end gap-[2px] h-3.5 ${className}`} aria-hidden>
      {[0, 0.25, 0.5].map((d) => (
        <span
          key={d}
          className={`w-[3px] h-full rounded-full bg-accent origin-bottom ${active ? 'animate-eq' : 'scale-y-[.35]'}`}
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </span>
  );
}

const rangeStyle = (v, max) => ({ '--p': `${max ? Math.min(100, (v / max) * 100) : 0}%` });

function SeekBar({ className = '' }) {
  const { currentTime, duration, seek } = useMusic();
  return (
    <input
      type="range" className={`seek w-full ${className}`} min={0} max={duration || 0} step="0.1"
      value={Math.min(currentTime, duration || 0)} style={rangeStyle(currentTime, duration)}
      onChange={(e) => seek(parseFloat(e.target.value))} aria-label="Seek"
    />
  );
}

function VolumeControl() {
  const { volume, muted, setVolume, toggleMute } = useMusic();
  const v = muted ? 0 : volume;
  return (
    <div className="flex items-center gap-2">
      <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        {v === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <input
        type="range" className="seek w-24" min={0} max={1} step="0.01" value={v}
        style={rangeStyle(v, 1)} onChange={(e) => setVolume(parseFloat(e.target.value))} aria-label="Volume"
      />
    </div>
  );
}

/* ---------- Now playing sheet (full controls + queue) ---------- */
function NowPlayingSheet() {
  const m = useMusic();
  const { current, playing, buffering, currentTime, duration, queue, index } = m;
  const RepeatIcon = m.repeat === 'one' ? Repeat1 : Repeat;
  return (
    <Modal open={m.panelOpen} onClose={() => m.setPanelOpen(false)} title="Now playing" size="md">
      {current ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center">
            <SongCover song={current} size={168} rounded="rounded-3xl" className={`shadow-glow ${playing ? '' : 'opacity-90'}`} />
            <h3 className="font-bold text-xl mt-4 truncate max-w-full">{current.title}</h3>
            <p className="text-sm text-muted">{current.artist}</p>
          </div>
          <div>
            <SeekBar />
            <div className="flex justify-between text-[11px] text-muted mt-1 tabular-nums">
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button className={`icon-btn ${m.shuffle ? '!text-accent' : ''}`} onClick={m.toggleShuffle} aria-label="Shuffle" aria-pressed={m.shuffle}>
              <Shuffle size={18} />
            </button>
            <button className="icon-btn !w-11 !h-11" onClick={m.prev} aria-label="Previous"><SkipBack size={22} /></button>
            <button className="w-14 h-14 rounded-full gradient-accent text-white grid place-items-center shadow-glow active:scale-95 transition" onClick={m.toggle} aria-label={playing ? 'Pause' : 'Play'}>
              {buffering ? <Loader2 size={24} className="spin" /> : playing ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
            </button>
            <button className="icon-btn !w-11 !h-11" onClick={m.next} aria-label="Next"><SkipForward size={22} /></button>
            <button className={`icon-btn ${m.repeat !== 'off' ? '!text-accent' : ''}`} onClick={m.cycleRepeat} aria-label={`Repeat: ${m.repeat}`}>
              <RepeatIcon size={18} />
            </button>
          </div>
          <div className="flex justify-center"><VolumeControl /></div>
          {m.error && <p className="text-xs text-danger text-center">{m.error}</p>}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Up next · {queue.length}</h4>
              <button className="text-xs text-danger font-semibold" onClick={m.stop}>Clear & close</button>
            </div>
            <ul className="space-y-1">
              {queue.map((s, i) => (
                <li key={`${s._id}-${i}`} className={`flex items-center gap-3 p-2 rounded-xl ${i === index ? 'bg-accent/10' : 'hover:bg-surface2'}`}>
                  <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => m.playSong(s, queue)}>
                    <SongCover song={s} size={36} rounded="rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold truncate ${i === index ? 'text-accent' : ''}`}>{s.title}</span>
                      <span className="block text-xs text-muted truncate">{s.artist}</span>
                    </span>
                    {i === index && <Equalizer active={playing} />}
                  </button>
                  <button className="icon-btn !w-8 !h-8" onClick={() => m.removeFromQueue(i)} aria-label="Remove from queue"><X size={15} /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted text-center py-8">Nothing is playing.</p>
      )}
    </Modal>
  );
}

/* ---------- Bottom mini player ---------- */
export function MiniPlayer() {
  const m = useMusic();
  const { current, playing, buffering } = m;
  if (!current) return null;
  return (
    <>
      <div className="fixed z-40 inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] md:bottom-0 md:safe-bottom px-2 md:px-0 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-[1000px] md:mb-3 card shadow-card !bg-surface/95 backdrop-blur-xl overflow-hidden animate-rise">
          <div className="md:hidden"><SeekBar className="!h-[3px] !rounded-none block" /></div>
          <div className="flex items-center gap-3 px-3 py-2">
            <button className="flex items-center gap-3 min-w-0 flex-1 md:flex-none md:w-64 text-left" onClick={() => m.setPanelOpen(true)} aria-label="Open player">
              <SongCover song={current} size={44} className={playing ? '' : 'opacity-80'} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{current.title}</span>
                <span className="block text-xs text-muted truncate">{m.error || current.artist}</span>
              </span>
            </button>

            <div className="hidden md:flex flex-1 items-center gap-3 min-w-0">
              <span className="text-[11px] text-muted w-9 text-right tabular-nums">{fmtTime(m.currentTime)}</span>
              <SeekBar />
              <span className="text-[11px] text-muted w-9 tabular-nums">{fmtTime(m.duration)}</span>
            </div>

            <div className="flex items-center gap-0.5">
              <button className="icon-btn hidden sm:inline-grid" onClick={m.prev} aria-label="Previous"><SkipBack size={18} /></button>
              <button className="w-10 h-10 rounded-full gradient-accent text-white grid place-items-center active:scale-95 transition" onClick={m.toggle} aria-label={playing ? 'Pause' : 'Play'}>
                {buffering ? <Loader2 size={18} className="spin" /> : playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <button className="icon-btn" onClick={m.next} aria-label="Next"><SkipForward size={18} /></button>
            </div>
            <div className="hidden lg:block"><VolumeControl /></div>
            <button className="icon-btn hidden sm:inline-grid" onClick={() => m.setPanelOpen(true)} aria-label="Queue"><ListMusic size={18} /></button>
            <button className="icon-btn" onClick={m.stop} aria-label="Close player"><X size={18} /></button>
          </div>
        </div>
      </div>
      <NowPlayingSheet />
    </>
  );
}

/* ---------- A song row (library, picker) ---------- */
export function SongRow({ song, list, index, onUpdate, onDeleted, onSelect, selected = false }) {
  const m = useMusic();
  const toast = useToast();
  const confirm = useConfirm();
  const isCurrent = m.current?._id === song._id;
  const isPlaying = isCurrent && m.playing;

  const like = async () => {
    const next = { ...song, liked: !song.liked, likesCount: song.likesCount + (song.liked ? -1 : 1) };
    onUpdate?.(next);
    try {
      const { data } = await api.post(`/songs/${song._id}/like`);
      onUpdate?.({ ...song, liked: data.liked, likesCount: data.likesCount });
    } catch (err) {
      onUpdate?.(song);
      toast.error(errMsg(err));
    }
  };

  const remove = async () => {
    const ok = await confirm({ title: 'Delete song?', message: `“${song.title}” will be removed for everyone.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.delete(`/songs/${song._id}`);
      m.dropSong(song._id);
      onDeleted?.(song);
      toast.success('Song deleted');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const queueIt = () => {
    const added = m.addToQueue(song);
    toast.info(added ? 'Added to queue' : 'Already in your queue');
  };

  return (
    <div className={`group flex items-center gap-3 px-3 py-2 rounded-2xl transition ${isCurrent ? 'bg-accent/10' : 'hover:bg-surface2'} ${selected ? 'ring-2 ring-accent' : ''}`}>
      {index !== undefined && (
        <span className="hidden sm:block w-5 text-center text-xs text-muted tabular-nums">
          {isCurrent ? <Equalizer active={isPlaying} /> : index + 1}
        </span>
      )}
      <button
        className="relative shrink-0"
        onClick={() => m.playSong(song, list || [song])}
        aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        <SongCover song={song} size={46} />
        <span className={`absolute inset-0 rounded-xl grid place-items-center bg-black/45 text-white transition ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </span>
      </button>

      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => (onSelect ? onSelect(song) : m.playSong(song, list || [song]))}>
        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-accent' : ''}`}>{song.title}</p>
        <p className="text-xs text-muted truncate">
          {song.artist}
          {song.uploader && !song.isDemo ? ` · added by @${song.uploader.username}` : song.isDemo ? ' · built-in' : ''}{song.external ? ' · link' : ''}
        </p>
      </div>

      <span className="hidden sm:block text-xs text-muted tabular-nums w-10 text-right">{song.duration ? fmtTime(song.duration) : ''}</span>

      {onSelect ? (
        <button className={`btn-sm ${selected ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onSelect(song)}>
          {selected ? <><Check size={14} /> Selected</> : 'Select'}
        </button>
      ) : (
        <div className="flex items-center">
          <button className={`icon-btn ${song.liked ? '!text-rose-500' : ''}`} onClick={like} aria-label={song.liked ? 'Unlike' : 'Like'} aria-pressed={song.liked}>
            <Heart size={17} fill={song.liked ? 'currentColor' : 'none'} />
          </button>
          <button className="icon-btn" onClick={queueIt} aria-label="Add to queue"><ListPlus size={18} /></button>
          {song.mine && !song.isDemo && (
            <button className="icon-btn hover:!text-danger" onClick={remove} aria-label="Delete song"><Trash2 size={17} /></button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Add songs: from your device (many at once) or from a link ---------- */
const AUDIO_RE = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i;
const isAudioFile = (f) => f.type.startsWith('audio/') || AUDIO_RE.test(f.name);
const nameToTitle = (n) => n.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();

// read duration from a File or a URL; resolves 0 on failure (or null when `strict` and it can't load)
const probeAudio = (src, { isFile = false, timeout = 9000 } = {}) =>
  new Promise((resolve) => {
    const a = new Audio();
    const url = isFile ? URL.createObjectURL(src) : src;
    let done = false;
    const finish = (v) => { if (done) return; done = true; clearTimeout(t); if (isFile) URL.revokeObjectURL(url); a.removeAttribute('src'); resolve(v); };
    const t = setTimeout(() => finish(null), timeout);
    a.preload = 'metadata';
    a.onloadedmetadata = () => finish(isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => finish(null);
    a.src = url;
  });

let itemId = 0;
export function UploadSongModal({ open, onClose, onUploaded, initialFiles }) {
  const toast = useToast();
  const [tab, setTab] = useState('device');
  const [items, setItems] = useState([]);
  const [artist, setArtist] = useState('');
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState({ url: '', title: '', artist: '' });
  const fileInput = useRef(null);
  const coverInput = useRef(null);

  const addFiles = async (list) => {
    const fresh = [];
    for (const f of [...list]) {
      if (!isAudioFile(f)) { toast.error(`${f.name} is not an audio file`); continue; }
      if (f.size > 40 * 1024 * 1024) { toast.error(`${f.name} is larger than 40 MB`); continue; }
      fresh.push({ id: ++itemId, file: f, title: nameToTitle(f.name), duration: 0, status: 'ready', progress: 0 });
    }
    if (!fresh.length) return;
    setItems((p) => [...p, ...fresh]);
    fresh.forEach(async (it) => {
      const d = await probeAudio(it.file, { isFile: true });
      setItems((p) => p.map((x) => (x.id === it.id ? { ...x, duration: d || 0 } : x)));
    });
  };

  useEffect(() => {
    if (!open) {
      setTab('device'); setItems([]); setArtist(''); setCover(null); setCoverPreview(''); setBusy(false);
      setLink({ url: '', title: '', artist: '' });
    } else if (initialFiles?.length) {
      setTab('device');
      addFiles(initialFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFiles]);

  const pickCover = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Cover must be an image');
    setCover(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const patch = (id, changes) => setItems((p) => p.map((x) => (x.id === id ? { ...x, ...changes } : x)));

  const uploadAll = async () => {
    const todo = items.filter((i) => i.status !== 'done');
    if (!todo.length) return;
    setBusy(true);
    let failed = 0;
    for (const it of todo) {
      const fd = new FormData();
      fd.append('audio', it.file);
      if (cover && items.length === 1) fd.append('cover', cover);
      fd.append('title', it.title.trim());
      fd.append('artist', artist.trim());
      fd.append('duration', String(it.duration || 0));
      patch(it.id, { status: 'uploading', progress: 0, error: '' });
      try {
        const { data } = await api.post('/songs', fd, {
          onUploadProgress: (ev) => ev.total && patch(it.id, { progress: Math.round((ev.loaded / ev.total) * 100) }),
        });
        patch(it.id, { status: 'done', progress: 100 });
        onUploaded?.(data.song);
      } catch (err) {
        failed++;
        patch(it.id, { status: 'error', error: errMsg(err) });
      }
    }
    setBusy(false);
    if (!failed) {
      toast.success(todo.length === 1 ? 'Song added' : `${todo.length} songs added`);
      onClose();
    } else {
      toast.error(`${failed} song${failed > 1 ? 's' : ''} failed — you can retry`);
    }
  };

  const addLink = async (e) => {
    e.preventDefault();
    const url = link.url.trim();
    if (!/^https?:\/\//i.test(url)) return toast.error('Paste a link that starts with http:// or https://');
    setBusy(true);
    try {
      const duration = await probeAudio(url);
      if (duration === null) {
        toast.error('That link can’t be played. Use a direct audio file link (.mp3, .m4a, .wav, .ogg…).');
        return;
      }
      const { data } = await api.post('/songs/link', { url, title: link.title, artist: link.artist, duration });
      toast.success('Song added from link');
      onUploaded?.(data.song);
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  const pending = items.filter((i) => i.status !== 'done').length;
  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title="Add songs" size="md">
      <div className="flex gap-2 mb-4">
        {[['device', 'From my device', Upload], ['link', 'From a link', Link2]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => !busy && setTab(id)} className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold border transition ${tab === id ? 'bg-accent text-white border-accent' : 'bg-surface2 border-line text-muted hover:text-ink'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'device' ? (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInput.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition ${drag ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/60'}`}
          >
            <input ref={fileInput} type="file" multiple accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <Upload className="mx-auto text-accent mb-1.5" />
            <p className="text-sm font-semibold">Drop songs here or click to browse</p>
            <p className="text-xs text-muted mt-1">Pick as many as you like · MP3, WAV, OGG, M4A, FLAC · up to 40 MB each</p>
          </div>

          {items.length > 0 && (
            <ul className="space-y-2 max-h-[34vh] overflow-y-auto pr-1">
              {items.map((it) => (
                <li key={it.id} className="rounded-2xl border border-line bg-surface2/60 p-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl gradient-accent grid place-items-center text-white shrink-0"><FileAudio size={18} /></div>
                    <input className="field !py-1.5 !text-sm" value={it.title} disabled={it.status === 'uploading' || it.status === 'done'} onChange={(e) => patch(it.id, { title: e.target.value })} maxLength={80} aria-label="Song title" />
                    <span className="text-[11px] text-muted tabular-nums w-9 text-right shrink-0">{it.duration ? fmtTime(it.duration) : ''}</span>
                    {it.status === 'done' ? <Check size={18} className="text-ok shrink-0" />
                      : it.status === 'uploading' ? <span className="text-xs text-accent w-9 text-right shrink-0">{it.progress}%</span>
                      : <button className="icon-btn !w-8 !h-8" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} disabled={busy} aria-label="Remove file"><X size={15} /></button>}
                  </div>
                  {it.status === 'uploading' && <div className="h-1 mt-2 rounded-full bg-line overflow-hidden"><div className="h-full gradient-accent transition-all" style={{ width: `${it.progress}%` }} /></div>}
                  {it.status === 'error' && <p className="text-xs text-danger mt-1.5">{it.error}</p>}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => coverInput.current?.click()} disabled={items.length !== 1}
              className="w-16 h-16 rounded-2xl border border-line bg-surface2 grid place-items-center overflow-hidden shrink-0 text-muted hover:border-accent transition disabled:opacity-40" title={items.length === 1 ? 'Add cover art' : 'Cover art is available when adding a single song'} aria-label="Choose cover">
              <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0])} />
              {coverPreview && items.length === 1 ? <img src={coverPreview} alt="" className="w-full h-full object-cover" /> : <div className="text-center text-[10px]"><ImagePlus size={18} className="mx-auto mb-0.5" />Cover</div>}
            </button>
            <input className="field self-center" placeholder="Artist for these songs (optional)" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={60} />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="btn-primary btn-sm" onClick={uploadAll} disabled={!pending || busy}>
              {busy ? <><Loader2 size={14} className="spin" /> Uploading…</> : <><Upload size={14} /> Add {pending > 1 ? `${pending} songs` : 'song'}</>}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={addLink} className="space-y-3">
          <p className="text-xs text-muted">Paste a <b className="text-ink">direct link to an audio file</b> (ends with .mp3, .m4a, .wav, .ogg…). It streams from there — nothing is uploaded. YouTube / Spotify / SoundCloud pages can’t be played.</p>
          <input className="field" type="url" placeholder="https://example.com/song.mp3" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} required autoFocus />
          <input className="field" placeholder="Song title (optional)" value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} maxLength={80} />
          <input className="field" placeholder="Artist (optional)" value={link.artist} onChange={(e) => setLink({ ...link, artist: e.target.value })} maxLength={60} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn-primary btn-sm" disabled={busy || !link.url.trim()}>{busy ? <><Loader2 size={14} className="spin" /> Checking…</> : <><Link2 size={14} /> Add from link</>}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ---------- Pick a song to attach to a post ---------- */
export function SongPicker({ open, onClose, onSelect, selectedId }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      api.get('/songs', { params: { scope, q } })
        .then((r) => alive && setSongs(r.data))
        .catch(() => alive && setSongs([]))
        .finally(() => alive && setLoading(false));
    }, q ? 250 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [open, q, scope]);

  const scopes = [['all', 'All'], ['liked', 'Liked'], ['mine', 'My uploads']];
  return (
    <>
      <Modal open={open} onClose={onClose} title="Attach a song" size="md">
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field !pl-10" placeholder="Search songs or artists" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <div className="flex items-center gap-2">
            {scopes.map(([id, label]) => (
              <button key={id} onClick={() => setScope(id)} className={`chip transition ${scope === id ? '!bg-accent !text-white !border-accent' : 'hover:text-ink'}`}>{label}</button>
            ))}
            <button className="ml-auto btn-ghost btn-sm" onClick={() => setUploadOpen(true)}><Upload size={13} /> Add new</button>
          </div>
          <div className="max-h-[48vh] overflow-y-auto -mx-2">
            {loading ? <div className="py-10 grid place-items-center"><Spinner /></div>
              : songs.length === 0 ? <p className="text-center text-sm text-muted py-10">No songs found.</p>
              : songs.map((s) => (
                <SongRow key={s._id} song={s} list={songs} selected={selectedId === s._id} onSelect={(song) => { onSelect(song); onClose(); }} />
              ))}
          </div>
        </div>
      </Modal>
      <UploadSongModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={(s) => { setSongs((p) => [s, ...p]); }} />
    </>
  );
}

/* ---------- Song chip shown inside a post ---------- */
export function PostSong({ song, onRemove }) {
  const m = useMusic();
  const isCurrent = m.current?._id === song._id;
  const isPlaying = isCurrent && m.playing;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl border border-line bg-surface2/60">
      <button onClick={() => m.playSong(song, [song])} className="relative shrink-0" aria-label={isPlaying ? 'Pause song' : 'Play song'}>
        <SongCover song={song} size={48} />
        <span className="absolute inset-0 rounded-xl grid place-items-center bg-black/40 text-white">
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate flex items-center gap-2">{song.title} {isPlaying && <Equalizer />}</p>
        <p className="text-xs text-muted truncate">{song.artist}{song.duration ? ` · ${fmtTime(song.duration)}` : ''}</p>
      </div>
      {onRemove ? (
        <button className="icon-btn" onClick={onRemove} aria-label="Remove song"><X size={16} /></button>
      ) : (
        <Music size={16} className="text-accent mr-1" />
      )}
    </div>
  );
}
