import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, MoreHorizontal, Send, Smile, Trash2, X } from 'lucide-react';
import api, { errMsg, mediaUrl } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useMusic } from '../context/MusicContext.jsx';
import { Avatar, EmptyState, Lightbox, Menu, MenuItem, Spinner, useConfirm } from '../components/ui.jsx';
import { useNotifs } from '../components/AppShell.jsx';
import { QUICK_EMOJIS } from '../utils/format.js';

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
function dayLabel(d) {
  const date = new Date(d);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yest)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
const clock = (d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const signature = (list) => list.map((m) => `${m._id}${m.read ? 1 : 0}${m.deleted ? 1 : 0}`).join('|');

export default function ChatPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh } = useNotifs();
  const { current: playing } = useMusic();
  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const [viewer, setViewer] = useState('');
  const bottom = useRef(null);
  const fileInput = useRef(null);
  const input = useRef(null);
  const lastSig = useRef('');
  const count = useRef(0);

  const load = useCallback(async (first = false) => {
    try {
      const { data } = await api.get(`/messages/conversations/${id}/messages`);
      setOther(data.user);
      const sig = signature(data.messages);
      if (first || sig !== lastSig.current) {
        lastSig.current = sig;
        setMessages((prev) => {
          // keep messages that are still being sent
          const pending = (prev || []).filter((m) => m.pending);
          return [...data.messages, ...pending];
        });
        refresh();
      }
    } catch (err) {
      if (first) setError(errMsg(err));
    }
  }, [id, refresh]);

  useEffect(() => {
    setMessages(null); setError(''); lastSig.current = ''; count.current = 0;
    load(true);
    const t = setInterval(() => !document.hidden && load(false), 3000);
    return () => clearInterval(t);
  }, [id, load]);

  useEffect(() => {
    if (!messages) return;
    if (messages.length !== count.current) {
      bottom.current?.scrollIntoView({ behavior: count.current ? 'smooth' : 'auto', block: 'end' });
      count.current = messages.length;
    }
  }, [messages]);

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Please choose a photo');
    if (f.size > 10 * 1024 * 1024) return toast.error('Photo is larger than 10 MB');
    setFile(f);
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if ((!body && !file) || sending) return;
    const tmp = { _id: `tmp-${Date.now()}`, sender: me._id, text: body, image: preview, createdAt: new Date().toISOString(), pending: true, read: false };
    const fd = new FormData();
    fd.append('text', body);
    if (file) fd.append('image', file);
    setMessages((p) => [...(p || []), tmp]);
    setText(''); setFile(null); setSending(true);
    try {
      const { data } = await api.post(`/messages/conversations/${id}/messages`, fd);
      setMessages((p) => p.map((m) => (m._id === tmp._id ? data.message : m)));
      lastSig.current = '';
    } catch (err) {
      setMessages((p) => p.filter((m) => m._id !== tmp._id));
      setText(body);
      toast.error(errMsg(err));
    } finally { setSending(false); input.current?.focus(); }
  };

  const unsend = async (m) => {
    if (!(await confirm({ title: 'Unsend message?', message: 'It will be removed for both of you.', confirmText: 'Unsend', danger: true }))) return;
    try {
      const { data } = await api.delete(`/messages/${m._id}`);
      setMessages((p) => p.map((x) => (x._id === m._id ? data.message : x)));
      lastSig.current = '';
    } catch (err) { toast.error(errMsg(err)); }
  };

  const addEmoji = (em) => {
    const el = input.current;
    const s = el?.selectionStart ?? text.length;
    setText((t) => t.slice(0, s) + em + t.slice(el?.selectionEnd ?? s));
    setTimeout(() => { el?.focus(); el?.setSelectionRange(s + em.length, s + em.length); }, 0);
  };

  if (error) return (
    <div className="p-6"><EmptyState icon="lock" title="Chat unavailable" text={error} action={<Link to="/messages" className="btn-primary btn-sm">Back to messages</Link>} /></div>
  );

  const lastMineIdx = messages ? messages.map((m) => m.sender === me._id && !m.pending).lastIndexOf(true) : -1;
  const canSend = (text.trim() || file) && !sending;

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen -mb-40 md:-mb-32">
      {/* header */}
      <div className="sticky top-14 md:top-0 z-30 bg-bg/90 backdrop-blur border-b border-line">
        <div className="flex items-center gap-3 px-3 h-14">
          <button className="icon-btn" onClick={() => navigate('/messages')} aria-label="Back to messages"><ArrowLeft size={20} /></button>
          {other ? (
            <Link to={`/u/${other.username}`} className="flex items-center gap-3 min-w-0">
              <Avatar user={other} size={36} />
              <span className="min-w-0"><span className="block font-semibold text-sm leading-tight truncate">{other.name}</span><span className="block text-xs text-muted truncate">@{other.username}</span></span>
            </Link>
          ) : <div className="skeleton h-8 w-40" />}
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 px-3 py-4">
        {messages === null ? <div className="py-16 grid place-items-center"><Spinner /></div>
          : messages.length === 0 ? (
            <div className="py-16 text-center">
              {other && <Avatar user={other} size={80} className="mx-auto" />}
              <p className="font-bold mt-3">{other?.name}</p>
              <p className="text-sm text-muted">Say hi to start the conversation.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {messages.map((m, i) => {
                const mine = m.sender === me._id;
                const prev = messages[i - 1];
                const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
                const gap = !prev || new Date(m.createdAt) - new Date(prev.createdAt) > 10 * 60 * 1000;
                const firstOfRun = !prev || prev.sender !== m.sender || newDay || gap;
                return (
                  <li key={m._id}>
                    {(newDay || gap) && <p className="text-center text-[11px] text-muted py-2">{newDay ? `${dayLabel(m.createdAt)}, ` : ''}{clock(m.createdAt)}</p>}
                    <div className={`group flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${firstOfRun ? 'mt-2' : ''}`}>
                      {!mine && <div className="w-7 shrink-0">{(firstOfRun || true) && (!messages[i + 1] || messages[i + 1].sender !== m.sender) ? <Avatar user={other} size={28} /> : null}</div>}
                      {mine && !m.deleted && !m.pending && (
                        <Menu trigger={<button className="icon-btn !w-7 !h-7 opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Message options"><MoreHorizontal size={16} /></button>}>
                          <MenuItem icon={Trash2} danger onClick={() => unsend(m)}>Unsend</MenuItem>
                        </Menu>
                      )}
                      <div className={`max-w-[75%] ${m.pending ? 'opacity-60' : ''}`}>
                        {m.deleted ? (
                          <p className="text-sm italic text-muted border border-line rounded-2xl px-3.5 py-2">Message unsent</p>
                        ) : (
                          <>
                            {m.image && (
                              <button onClick={() => setViewer(m.image)} className="block mb-1" aria-label="Open photo">
                                <img src={mediaUrl(m.image)} alt="" className="max-h-64 rounded-2xl object-cover border border-line" />
                              </button>
                            )}
                            {m.text && (
                              <p className={`text-[15px] px-3.5 py-2 rounded-2xl whitespace-pre-wrap break-words ${mine ? 'bg-accent text-white' : 'bg-surface2 text-ink'}`}>{m.text}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {mine && i === lastMineIdx && <p className="text-right text-[11px] text-muted mt-0.5 pr-1">{m.read ? 'Seen' : 'Sent'}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        <div ref={bottom} />
      </div>

      {/* composer */}
      <div className={`sticky z-30 bg-bg border-t border-line px-3 py-2.5 ${playing ? 'bottom-[132px] md:bottom-[76px]' : 'bottom-[60px] md:bottom-0'}`}>
        {preview && (
          <div className="relative inline-block mb-2">
            <img src={preview} alt="" className="h-20 rounded-xl border border-line" />
            <button onClick={() => setFile(null)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ink text-bg grid place-items-center" aria-label="Remove photo"><X size={13} /></button>
          </div>
        )}
        <form onSubmit={send} className="flex items-end gap-1.5">
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className="icon-btn shrink-0" onClick={() => fileInput.current?.click()} aria-label="Add photo"><ImagePlus size={21} /></button>
          <Menu align="left" width="w-64" trigger={<button type="button" className="icon-btn shrink-0" aria-label="Emoji"><Smile size={21} /></button>}>
            <div className="grid grid-cols-6 gap-1 p-1" onClick={(e) => e.stopPropagation()}>
              {QUICK_EMOJIS.map((em) => <button type="button" key={em} className="text-xl h-9 rounded-lg hover:bg-surface2" onClick={() => addEmoji(em)}>{em}</button>)}
            </div>
          </Menu>
          <textarea
            ref={input} value={text} rows={1} maxLength={1000} placeholder="Message…" aria-label="Message"
            onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="field !rounded-2xl resize-none flex-1 !py-2"
          />
          <button className="btn-primary !px-3 shrink-0 h-9" disabled={!canSend} aria-label="Send message"><Send size={17} /></button>
        </form>
      </div>
      {viewer && <Lightbox items={[{ url: viewer, type: 'image' }]} index={0} onClose={() => setViewer('')} onIndex={() => {}} />}
    </div>
  );
}
