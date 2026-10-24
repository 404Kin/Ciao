import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Send, Trash2, CornerDownRight, X } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../utils/format.js';
import { Avatar, Spinner, useConfirm } from './ui.jsx';

function CommentItem({ c, onLike, onDelete, onReply, isReply = false }) {
  return (
    <div className={`flex gap-2.5 ${isReply ? 'mt-2.5' : ''}`}>
      <Link to={`/u/${c.author?.username}`}><Avatar user={c.author} size={isReply ? 28 : 34} /></Link>
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full bg-surface2 rounded-2xl rounded-tl-md px-3.5 py-2">
          <Link to={`/u/${c.author?.username}`} className="text-[13px] font-bold hover:underline">{c.author?.name || 'Deleted user'}</Link>
          <p className="text-sm whitespace-pre-wrap break-words">{c.text}</p>
        </div>
        <div className="flex items-center gap-4 px-2 mt-1 text-xs text-muted">
          <span>{timeAgo(c.createdAt)}</span>
          <button onClick={() => onLike(c)} className={`font-semibold hover:text-ink flex items-center gap-1 ${c.liked ? '!text-rose-500' : ''}`} aria-pressed={c.liked}>
            <Heart size={12} fill={c.liked ? 'currentColor' : 'none'} /> {c.likesCount > 0 ? c.likesCount : 'Like'}
          </button>
          <button onClick={() => onReply(c)} className="font-semibold hover:text-ink">Reply</button>
          {c.canDelete && (
            <button onClick={() => onDelete(c)} className="font-semibold hover:text-danger flex items-center gap-1" aria-label="Delete comment">
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentsSection({ postId, onCount, autoFocus = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    let alive = true;
    api.get(`/posts/${postId}/comments`)
      .then((r) => alive && setComments(r.data))
      .catch((e) => { if (alive) { setComments([]); toast.error(errMsg(e)); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);

  const { top, replies } = useMemo(() => {
    const list = comments || [];
    const byParent = {};
    list.filter((c) => c.parent).forEach((c) => (byParent[c.parent] ||= []).push(c));
    return { top: list.filter((c) => !c.parent), replies: byParent };
  }, [comments]);

  const send = async (e) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, { text: t, parent: replyTo?._id || null });
      setComments((p) => [...(p || []), data.comment]);
      onCount?.(data.commentsCount);
      setText('');
      setReplyTo(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  const like = async (c) => {
    const flip = (liked, n) => setComments((p) => p.map((x) => (x._id === c._id ? { ...x, liked, likesCount: n } : x)));
    flip(!c.liked, c.likesCount + (c.liked ? -1 : 1));
    try {
      const { data } = await api.post(`/comments/${c._id}/like`);
      flip(data.liked, data.likesCount);
    } catch (err) {
      flip(c.liked, c.likesCount);
      toast.error(errMsg(err));
    }
  };

  const remove = async (c) => {
    const ok = await confirm({ title: 'Delete comment?', message: 'This can’t be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      const { data } = await api.delete(`/comments/${c._id}`);
      const gone = new Set(data.removed || [c._id]);
      setComments((p) => p.filter((x) => !gone.has(x._id)));
      if (data.commentsCount !== undefined) onCount?.(data.commentsCount);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const startReply = (c) => {
    setReplyTo(c);
    input.current?.focus();
  };

  return (
    <div className="pt-3 border-t border-line mt-3">
      {comments === null ? (
        <div className="py-4 grid place-items-center"><Spinner /></div>
      ) : top.length === 0 ? (
        <p className="text-sm text-muted text-center py-3">No comments yet — be the first to say something 💬</p>
      ) : (
        <div className="space-y-3.5 mb-3">
          {top.map((c) => (
            <div key={c._id}>
              <CommentItem c={c} onLike={like} onDelete={remove} onReply={startReply} />
              {(replies[c._id] || []).length > 0 && (
                <div className="ml-10 pl-3 border-l-2 border-line">
                  {replies[c._id].map((r) => (
                    <CommentItem key={r._id} c={r} isReply onLike={like} onDelete={remove} onReply={() => startReply(r)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {replyTo && (
        <div className="flex items-center gap-2 text-xs text-muted mb-2 px-1">
          <CornerDownRight size={13} /> Replying to <b className="text-ink">{replyTo.author?.name}</b>
          <button onClick={() => setReplyTo(null)} className="ml-auto hover:text-ink" aria-label="Cancel reply"><X size={14} /></button>
        </div>
      )}
      <form onSubmit={send} className="flex items-center gap-2.5">
        <Avatar user={user} size={34} />
        <input
          ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={500}
          placeholder={replyTo ? `Reply to ${replyTo.author?.name}…` : 'Write a comment…'} className="field !rounded-full"
        />
        <button type="submit" disabled={!text.trim() || sending} className="icon-btn !text-accent disabled:!text-muted" aria-label="Send comment">
          {sending ? <Spinner size={18} /> : <Send size={19} />}
        </button>
      </form>
    </div>
  );
}
