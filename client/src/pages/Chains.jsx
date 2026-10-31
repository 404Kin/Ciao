import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Link2, ImagePlus, X, Loader2, Check } from 'lucide-react';
import api, { errMsg, mediaUrl } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Tabs, EmptyState, Modal, Spinner, Avatar } from '../components/ui.jsx';
import PeoplePicker from '../components/PeoplePicker.jsx';
import { timeAgo } from '../utils/format.js';
import { gradCss } from '../utils/collage.js';

// Small picker used by "create" and "add my piece": one optional photo + one line
export function PiecePicker({ text, setText, file, setFile, placeholder }) {
  const input = useRef(null);
  const [preview, setPreview] = useState('');
  const toast = useToast();
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const pick = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Please choose a photo');
    if (f.size > 12 * 1024 * 1024) return toast.error('Photo is larger than 12 MB');
    setFile(f);
  };
  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea className="field resize-none" rows={2} maxLength={140} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
        <span className="absolute right-3 bottom-2 text-[11px] text-muted">{text.length}/140</span>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-line">
          <img src={preview} alt="" className="w-full max-h-52 object-cover" />
          <button type="button" onClick={() => setFile(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/65 text-white grid place-items-center" aria-label="Remove photo"><X size={15} /></button>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-line hover:border-accent/60 py-3 text-sm text-muted hover:text-ink transition inline-flex items-center justify-center gap-2">
          <ImagePlus size={17} /> Add a photo (optional)
        </button>
      )}
    </div>
  );
}

function CreateChainModal({ open, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [people, setPeople] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) { setTitle(''); setText(''); setFile(null); setPeople([]); setBusy(false); } }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Give your chain a title');
    if (!text.trim() && !file) return toast.error('Start the chain with a photo or a line');
    if (!people.length) return toast.error('Tag at least one person');
    const fd = new FormData();
    fd.append('title', title.trim());
    fd.append('text', text.trim());
    fd.append('invited', JSON.stringify(people.map((p) => p._id)));
    if (file) fd.append('image', file);
    setBusy(true);
    try {
      const { data } = await api.post('/chains', fd);
      toast.success('Chain started. Your friends have been tagged.');
      onClose();
      navigate(`/chain/${data.chain._id}`);
    } catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title="Start a chain" size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">Tag your friends. Each of them adds <b className="text-ink">one photo or one line</b>, and together it becomes a collage story.</p>
        <input className="field" placeholder="Chain title, e.g. Our Cox's Bazar trip" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus />
        <div>
          <p className="text-xs font-semibold text-muted mb-1.5">Your opening piece</p>
          <PiecePicker text={text} setText={setText} file={file} setFile={setFile} placeholder="Write the first line of the story…" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted mb-1.5">Tag people who can add to it</p>
          <PeoplePicker selected={people} onChange={setPeople} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-primary btn-sm" disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <Link2 size={14} />} Start chain</button>
        </div>
      </form>
    </Modal>
  );
}

function ChainCard({ c }) {
  const imgs = c.entries.filter((e) => e.image).slice(0, 3);
  return (
    <Link to={`/chain/${c._id}`} className="card block p-4 hover:border-accent/50 transition animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold truncate">{c.title}</h3>
          <p className="text-xs text-muted mt-0.5">by @{c.owner.username} · {timeAgo(c.createdAt)}</p>
        </div>
        {c.myTurn ? <span className="chip !bg-accent !text-white !border-accent shrink-0">Your turn</span>
          : c.status === 'done' ? <span className="chip shrink-0"><Check size={12} /> Completed</span>
          : <span className="chip shrink-0">{c.entries.length - 1}/{c.invited.length} added</span>}
      </div>
      <div className="flex gap-1.5 mt-3">
        {c.entries.slice(0, 4).map((e, i) => (
          <div key={e._id} className="w-16 h-16 rounded-xl overflow-hidden border border-line grid place-items-center text-white text-[9px] font-bold p-1 text-center leading-tight" style={e.image ? undefined : { background: gradCss(i) }}>
            {e.image ? <img src={mediaUrl(e.image)} alt="" className="w-full h-full object-cover" /> : <span className="line-clamp-3">{e.text}</span>}
          </div>
        ))}
        {c.pendingCount > 0 && <div className="w-16 h-16 rounded-xl border-2 border-dashed border-line grid place-items-center text-xs text-muted">+{c.pendingCount}</div>}
      </div>
      <div className="flex -space-x-2 mt-3">
        {[c.owner, ...c.invited].slice(0, 7).map((u) => <Avatar key={u._id} user={u} size={24} className="ring-2 ring-surface" />)}
      </div>
    </Link>
  );
}

export default function Chains() {
  const [tab, setTab] = useState('turn');
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    setItems(null);
    api.get('/chains', { params: { scope: tab } })
      .then((r) => alive && setItems(r.data))
      .catch((e) => { if (alive) { setItems([]); toast.error(errMsg(e)); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const empty = {
    turn: ['✨', 'Nothing waiting for you', 'When a friend tags you in a chain, it shows up here.'],
    mine: ['🔗', 'No open chains', 'Start one and tag your friends.'],
    done: ['📚', 'No finished chains yet', 'Completed chains become collage stories you can share.'],
  }[tab];

  return (
    <>
      <PageHeader title="Chains" subtitle="Build a collage story together"
        right={<button className="btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={14} /> New chain</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'turn', label: 'Your turn' }, { id: 'mine', label: 'Started by me' }, { id: 'done', label: 'Completed' }]} />
      <div className="p-4 space-y-3">
        {items === null ? <div className="py-16 grid place-items-center"><Spinner /></div>
          : items.length === 0 ? <EmptyState emoji={empty[0]} title={empty[1]} text={empty[2]} action={<button className="btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={14} /> Start a chain</button>} />
          : items.map((c) => <ChainCard key={c._id} c={c} />)}
      </div>
      <CreateChainModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
