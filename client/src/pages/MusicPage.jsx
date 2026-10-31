import { useEffect, useMemo, useState } from 'react';
import { Play, Shuffle, Upload, Search, Music as MusicIcon } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { PageHeader, Tabs, EmptyState, Spinner } from '../components/ui.jsx';
import { SongRow, UploadSongModal } from '../components/music.jsx';
import { useMusic } from '../context/MusicContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function MusicPage() {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [songs, setSongs] = useState(null);
  const [open, setOpen] = useState(false);
  const [dropped, setDropped] = useState(null);
  const [dragging, setDragging] = useState(false);
  const m = useMusic();
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    setSongs(null);
    const t = setTimeout(() => {
      api.get('/songs', { params: { scope: tab, q } })
        .then((r) => alive && setSongs(r.data))
        .catch((e) => { if (alive) { setSongs([]); toast.error(errMsg(e)); } });
    }, q ? 250 : 0);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q]);

  const update = (s) => setSongs((p) => {
    const next = p.map((x) => (x._id === s._id ? s : x));
    return tab === 'liked' && !s.liked ? next.filter((x) => x._id !== s._id) : next;
  });
  const totalTime = useMemo(() => (songs || []).reduce((a, s) => a + (s.duration || 0), 0), [songs]);

  const playAll = (shuffle) => {
    if (!songs?.length) return;
    if (shuffle && !m.shuffle) m.toggleShuffle();
    if (!shuffle && m.shuffle) m.toggleShuffle();
    const first = shuffle ? songs[Math.floor(Math.random() * songs.length)] : songs[0];
    m.playSong(first, songs);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length) { setDropped(files); setOpen(true); }
  };

  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={onDrop}
      className="relative"
    >
      {dragging && (
        <div className="absolute inset-2 z-20 rounded-3xl border-2 border-dashed border-accent bg-accent/15 backdrop-blur-sm grid place-items-center pointer-events-none">
          <p className="font-bold text-accent text-lg">Drop songs to add them</p>
        </div>
      )}
      <PageHeader title="Music" subtitle="Your shared library"
        right={<button className="btn-primary btn-sm" onClick={() => setOpen(true)}><Upload size={14} /> Add song</button>} />

      <div className="p-4 space-y-4">
        <div className="rounded-3xl gradient-accent p-5 text-white flex items-center gap-4 shadow-glow">
          <div className="w-16 h-16 rounded-2xl bg-white/20 grid place-items-center shrink-0"><MusicIcon size={30} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-xl">Ciao Music</h2>
            <p className="text-white/80 text-sm">{songs ? `${songs.length} song${songs.length === 1 ? '' : 's'}${totalTime ? ` · ${Math.round(totalTime / 60)} min` : ''}` : 'Loading…'}</p>
          </div>
          <div className="flex gap-2">
            <button className="w-11 h-11 rounded-full bg-white text-accent grid place-items-center hover:scale-105 active:scale-95 transition" onClick={() => playAll(false)} aria-label="Play all" disabled={!songs?.length}><Play size={20} className="ml-0.5" /></button>
            <button className="w-11 h-11 rounded-full bg-white/20 grid place-items-center hover:bg-white/30 active:scale-95 transition" onClick={() => playAll(true)} aria-label="Shuffle play" disabled={!songs?.length}><Shuffle size={18} /></button>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field !rounded-full !pl-11" placeholder="Search songs or artists" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="card overflow-hidden">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All songs' }, { id: 'liked', label: 'Liked' }, { id: 'mine', label: 'My uploads' }]} />
          <div className="p-2">
            {songs === null ? <div className="py-12 grid place-items-center"><Spinner /></div>
              : songs.length === 0 ? (
                <div className="py-6"><EmptyState emoji={tab === 'liked' ? '💜' : '🎧'}
                  title={q ? 'No matches' : tab === 'liked' ? 'No liked songs yet' : tab === 'mine' ? 'You haven’t added any songs' : 'The library is empty'}
                  text={tab === 'liked' ? 'Tap the heart on a song to add it here.' : 'Add a song from your device to get started.'}
                  action={tab !== 'liked' && <button className="btn-primary btn-sm" onClick={() => setOpen(true)}><Upload size={14} /> Add a song</button>} /></div>
              ) : songs.map((s, i) => (
                <SongRow key={s._id} song={s} list={songs} index={i} onUpdate={update}
                  onDeleted={(d) => setSongs((p) => p.filter((x) => x._id !== d._id))} />
              ))}
          </div>
        </div>
      </div>

      <UploadSongModal open={open} initialFiles={dropped} onClose={() => { setOpen(false); setDropped(null); }} onUploaded={(s) => { if (tab !== 'liked') setSongs((p) => [s, ...(p || [])]); }} />
    </div>
  );
}
