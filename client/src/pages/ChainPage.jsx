import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Download, Flag, Loader2, Send, Share2, Trash2 } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar, EmptyState, Lightbox, PageHeader, Spinner, useConfirm } from '../components/ui.jsx';
import Collage from '../components/Collage.jsx';
import { PiecePicker } from './Chains.jsx';
import { renderCollageBlob } from '../utils/collage.js';

export default function ChainPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [chain, setChain] = useState(undefined);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState('');
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    setChain(undefined);
    api.get(`/chains/${id}`).then((r) => setChain(r.data)).catch((e) => { setChain(null); setError(errMsg(e)); });
  }, [id]);

  if (chain === undefined) return <><PageHeader back title="Chain" /><div className="py-20 grid place-items-center"><Spinner size={26} /></div></>;
  if (chain === null) return <><PageHeader back title="Chain" /><div className="p-4"><EmptyState emoji="🔒" title="Can’t open this chain" text={error} /></div></>;

  const done = chain.status === 'done';
  const pending = chain.invited.filter((u) => !u.done);
  const imageEntries = chain.entries.filter((e) => e.image);

  const addPiece = async () => {
    if (!text.trim() && !file) return toast.error('Add a photo or a line');
    const fd = new FormData();
    fd.append('text', text.trim());
    if (file) fd.append('image', file);
    setBusy('add');
    try {
      const { data } = await api.post(`/chains/${id}/entries`, fd);
      setChain(data.chain); setText(''); setFile(null);
      toast.success(data.chain.status === 'done' ? 'Chain complete. The collage is ready' : 'Your piece was added');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); }
  };

  const finish = async () => {
    const ok = await confirm({ title: 'Finish the chain now?', message: pending.length ? `${pending.length} tagged ${pending.length === 1 ? 'person hasn’t' : 'people haven’t'} added their piece yet. They won’t be able to after this.` : 'Everyone has added their piece.', confirmText: 'Finish' });
    if (!ok) return;
    setBusy('finish');
    try { const { data } = await api.post(`/chains/${id}/finish`); setChain(data.chain); toast.success('Chain finished'); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); }
  };

  const remove = async () => {
    const ok = await confirm({ title: 'Delete this chain?', message: 'Everyone’s pieces will be removed.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try { await api.delete(`/chains/${id}`); toast.success('Chain deleted'); navigate('/chains'); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const shareToFeed = async () => {
    setBusy('share');
    try {
      const blob = await renderCollageBlob(chain);
      const fd = new FormData();
      fd.append('media', new File([blob], 'chain-collage.jpg', { type: 'image/jpeg' }));
      fd.append('text', `${chain.title}: a collage story by ${chain.entries.length} friends #chain`);
      fd.append('mood', 'happy');
      const { data } = await api.post('/posts', fd);
      window.dispatchEvent(new CustomEvent('ciao:new-post', { detail: data.post }));
      toast.success('Shared to your feed');
      navigate('/');
    } catch (err) { toast.error(errMsg(err) || 'Could not build the collage'); } finally { setBusy(''); }
  };

  const download = async () => {
    setBusy('download');
    try {
      const blob = await renderCollageBlob(chain);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${chain.title.replace(/[^\w]+/g, '-').toLowerCase() || 'chain'}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error(errMsg(err) || 'Could not build the collage'); } finally { setBusy(''); }
  };

  return (
    <>
      <PageHeader back title={chain.title} subtitle={`Started by @${chain.owner.username}`} />
      <div className="p-4 space-y-4">
        {/* progress */}
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold">{done ? 'Collage story' : `${chain.entries.length - 1} of ${chain.invited.length} added`}</p>
            <span className={`chip ${done ? '!bg-ok/15 !text-ok !border-ok/40' : ''}`}>{done ? 'Completed' : 'Open'}</span>
          </div>
          {!done && <div className="h-2 rounded-full bg-surface2 overflow-hidden mt-3"><div className="h-full gradient-accent transition-all" style={{ width: `${((chain.entries.length - 1) / chain.invited.length) * 100}%` }} /></div>}
          <div className="flex flex-wrap gap-2 mt-3">
            {chain.invited.map((u) => (
              <span key={u._id} className="chip gap-1.5 !pl-1.5" title={u.done ? 'Added their piece' : 'Waiting'}>
                <Avatar user={u} size={18} /> @{u.username} {u.done ? <Check size={12} className="text-ok" /> : <span className="opacity-60">…</span>}
              </span>
            ))}
          </div>
        </div>

        {/* my turn */}
        {chain.myTurn && (
          <div className="card p-4 border-accent/50 space-y-3">
            <h3 className="font-bold">It’s your turn</h3>
            <p className="text-xs text-muted -mt-2">Add one photo or one line to the story.</p>
            <PiecePicker text={text} setText={setText} file={file} setFile={setFile} placeholder="Continue the story…" />
            <div className="flex justify-end">
              <button className="btn-primary btn-sm" onClick={addPiece} disabled={busy === 'add' || (!text.trim() && !file)}>
                {busy === 'add' ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Add to chain
              </button>
            </div>
          </div>
        )}

        <Collage entries={chain.entries} pending={done ? [] : pending} onOpenImage={(e) => setViewer(imageEntries.findIndex((x) => x._id === e._id))} />

        <div className="flex flex-wrap gap-2 justify-end">
          {done && (
            <>
              <button className="btn-ghost btn-sm" onClick={download} disabled={!!busy}>{busy === 'download' ? <Loader2 size={14} className="spin" /> : <Download size={14} />} Save picture</button>
              <button className="btn-primary btn-sm" onClick={shareToFeed} disabled={!!busy}>{busy === 'share' ? <Loader2 size={14} className="spin" /> : <Share2 size={14} />} Share to feed</button>
            </>
          )}
          {chain.isOwner && !done && <button className="btn-ghost btn-sm" onClick={finish} disabled={!!busy}><Flag size={14} /> Finish now</button>}
          {chain.isOwner && <button className="btn-ghost btn-sm hover:!text-danger" onClick={remove}><Trash2 size={14} /> Delete</button>}
        </div>
      </div>
      {viewer !== null && viewer >= 0 && (
        <Lightbox items={imageEntries.map((e) => ({ url: e.image, type: 'image' }))} index={viewer} onClose={() => setViewer(null)} onIndex={setViewer} />
      )}
    </>
  );
}
