import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageCircle, Bookmark, Share2, MoreHorizontal, Pencil, Trash2, Flag, Link2, Play, ThumbsUp,
} from 'lucide-react';
import api, { errMsg, mediaUrl } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ReportDialog from './ReportDialog.jsx';
import { MOODS, REACTIONS, reactionOf, timeAgo, compact } from '../utils/format.js';
import { Avatar, Menu, MenuItem, Lightbox, useConfirm } from './ui.jsx';
import { PostSong } from './music.jsx';
import CommentsSection from './CommentsSection.jsx';

/* #hashtags and @mentions become links */
function RichText({ text }) {
  const parts = text.split(/(#[\p{L}\p{N}_]{2,30}|@[a-z0-9_]{3,20})/gu);
  return (
    <>
      {parts.map((p, i) => {
        if (/^#/.test(p)) return <Link key={i} to={`/tag/${p.slice(1).toLowerCase()}`} className="text-accent font-medium hover:underline">{p}</Link>;
        if (/^@/.test(p)) return <Link key={i} to={`/u/${p.slice(1)}`} className="text-accent font-medium hover:underline">{p}</Link>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function MediaGrid({ media, onOpen }) {
  const n = media.length;
  if (!n) return null;
  const cell = (m, i, cls = '') =>
    m.type === 'video' ? (
      <div key={i} className={`relative bg-black ${cls}`}>
        <video src={mediaUrl(m.url)} controls playsInline preload="metadata" className="w-full h-full object-contain max-h-[560px]" />
      </div>
    ) : (
      <button key={i} onClick={() => onOpen(i)} className={`relative overflow-hidden bg-surface2 block ${cls}`} aria-label="Open photo">
        <img src={mediaUrl(m.url)} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-[1.02] transition duration-300" />
      </button>
    );

  if (n === 1) {
    const m = media[0];
    return (
      <div className="rounded-2xl overflow-hidden border border-line">
        {m.type === 'video' ? cell(m, 0) : (
          <button onClick={() => onOpen(0)} className="block w-full bg-surface2" aria-label="Open photo">
            <img src={mediaUrl(m.url)} alt="" loading="lazy" className="w-full max-h-[560px] object-cover" />
          </button>
        )}
      </div>
    );
  }
  const layout = n === 2 ? 'grid-cols-2 aspect-[2/1]' : n === 3 ? 'grid-cols-2 grid-rows-2 aspect-[4/3]' : 'grid-cols-2 grid-rows-2 aspect-square';
  return (
    <div className={`grid gap-0.5 rounded-2xl overflow-hidden border border-line ${layout}`}>
      {media.map((m, i) => cell(m, i, n === 3 && i === 0 ? 'row-span-2' : ''))}
    </div>
  );
}

export default function PostCard({ post, onChange, defaultOpenComments = false }) {
  const toast = useToast();
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(defaultOpenComments);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.text);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [picker, setPicker] = useState(false);
  const [lightbox, setLightbox] = useState(-1);
  const pressTimer = useRef(null);
  const hoverTimer = useRef(null);
  const pickerRef = useRef(null);

  const mood = MOODS[post.mood];
  const my = reactionOf(post.myReaction);
  const long = post.text.length > 280 && !expanded;

  useEffect(() => {
    if (!picker) return;
    const close = (e) => !pickerRef.current?.contains(e.target) && setPicker(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, [picker]);

  /* ----- reactions (optimistic) ----- */
  const react = async (type) => {
    setPicker(false);
    const prev = post;
    const counts = { ...post.reactionCounts };
    if (post.myReaction) {
      counts[post.myReaction] = Math.max(0, (counts[post.myReaction] || 1) - 1);
      if (!counts[post.myReaction]) delete counts[post.myReaction];
    }
    const removing = post.myReaction === type;
    if (!removing) counts[type] = (counts[type] || 0) + 1;
    onChange({
      ...post, myReaction: removing ? null : type, reactionCounts: counts,
      reactionsTotal: Object.values(counts).reduce((a, b) => a + b, 0),
    });
    try {
      const { data } = await api.post(`/posts/${post._id}/react`, { type });
      onChange({ ...post, myReaction: data.myReaction, reactionCounts: data.reactionCounts, reactionsTotal: data.reactionsTotal });
    } catch (err) {
      onChange(prev);
      toast.error(errMsg(err));
    }
  };

  const onPressStart = () => { pressTimer.current = setTimeout(() => { setPicker(true); pressTimer.current = 'fired'; }, 450); };
  const onPressEnd = (e) => {
    if (pressTimer.current === 'fired') { e.preventDefault(); pressTimer.current = null; return; }
    clearTimeout(pressTimer.current); pressTimer.current = null;
  };

  const save = async () => {
    try {
      const { data } = await api.post(`/posts/${post._id}/save`);
      onChange({ ...post, saved: data.saved });
      toast.success(data.saved ? 'Saved to your bookmarks' : 'Removed from saved');
    } catch (err) { toast.error(errMsg(err)); }
  };

  const share = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Ciao', text: post.text.slice(0, 80), url }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    copyLink();
  };
  const copyLink = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    try { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
    catch {
      const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); toast.success('Link copied'); } catch { toast.info(url); }
      t.remove();
    }
  };

  const saveEdit = async () => {
    if (!draft.trim() && !post.media.length && !post.song) return toast.error('Post cannot be empty');
    setSaving(true);
    try {
      const { data } = await api.patch(`/posts/${post._id}`, { text: draft });
      onChange(data.post);
      setEditing(false);
      toast.success('Post updated');
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  const remove = async () => {
    const ok = await confirm({ title: 'Delete post?', message: 'This post and its comments will be permanently removed.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.delete(`/posts/${post._id}`);
      onChange(null);
      toast.success('Post deleted');
    } catch (err) { toast.error(errMsg(err)); }
  };

  const adminRemove = async () => {
    const ok = await confirm({ title: 'Remove this post?', message: 'The author is notified that it broke the guidelines. This is recorded in the admin log.', confirmText: 'Remove', danger: true });
    if (!ok) return;
    try {
      await api.delete(`/admin/posts/${post._id}`, { data: { reason: 'It broke the community guidelines.' } });
      onChange(null);
      toast.success('Post removed');
    } catch (err) { toast.error(errMsg(err)); }
  };

  const topReactions = Object.entries(post.reactionCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const imageItems = post.media.map((m) => ({ ...m }));

  return (
    <article className="card p-4 animate-rise" data-testid="post-card">
      {/* header */}
      <header className="flex items-center gap-3">
        <Link to={`/u/${post.author?.username}`}><Avatar user={post.author} size={44} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to={`/u/${post.author?.username}`} className="font-bold text-[15px] hover:underline truncate">{post.author?.name || 'Deleted user'}</Link>
            {mood && <span title={`Feeling ${mood.label}`} className="text-sm">{mood.emoji}</span>}
          </div>
          <p className="text-xs text-muted">
            @{post.author?.username} · <Link to={`/post/${post._id}`} className="hover:underline">{timeAgo(post.createdAt)}</Link>{post.edited ? ' · edited' : ''}
          </p>
        </div>
        <Menu trigger={<button className="icon-btn" aria-label="Post options"><MoreHorizontal size={20} /></button>}>
          <MenuItem icon={Link2} onClick={copyLink}>Copy link</MenuItem>
          {post.mine ? (
            <>
              <MenuItem icon={Pencil} onClick={() => { setDraft(post.text); setEditing(true); }}>Edit post</MenuItem>
              <MenuItem icon={Trash2} danger onClick={remove}>Delete post</MenuItem>
            </>
          ) : (
            <>
              {user.role === 'admin' && <MenuItem icon={Trash2} danger onClick={adminRemove}>Remove (admin)</MenuItem>}
              <MenuItem icon={Flag} danger onClick={() => setReportOpen(true)}>Report post</MenuItem>
            </>
          )}
        </Menu>
      </header>

      {/* body */}
      <div className="mt-3 space-y-3">
        {editing ? (
          <div className="space-y-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={2000} className="field resize-none" autoFocus />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn-primary btn-sm" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        ) : post.text ? (
          <p className="text-[15px] whitespace-pre-wrap break-words">
            <RichText text={long ? post.text.slice(0, 280) + '…' : post.text} />
            {post.text.length > 280 && (
              <button className="ml-1 text-accent text-sm font-semibold hover:underline" onClick={() => setExpanded((e) => !e)}>
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </p>
        ) : null}

        <MediaGrid media={post.media} onOpen={(i) => setLightbox(i)} />
        {post.song && <PostSong song={post.song} />}
      </div>

      {/* counts */}
      {(post.reactionsTotal > 0 || post.commentsCount > 0) && (
        <div className="flex items-center justify-between text-xs text-muted mt-3">
          <div className="flex items-center gap-1.5">
            {topReactions.length > 0 && (
              <span className="flex -space-x-1">
                {topReactions.map(([t]) => (
                  <span key={t} className="w-5 h-5 rounded-full bg-surface2 border border-surface grid place-items-center text-[11px]">{reactionOf(t)?.emoji}</span>
                ))}
              </span>
            )}
            {post.reactionsTotal > 0 && <span>{compact(post.reactionsTotal)}</span>}
          </div>
          {post.commentsCount > 0 && (
            <button className="hover:underline" onClick={() => setShowComments((s) => !s)}>
              {compact(post.commentsCount)} comment{post.commentsCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      )}

      {/* actions */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-line -mx-1">
        <div className="relative" ref={pickerRef}
          onMouseEnter={() => { hoverTimer.current = setTimeout(() => setPicker(true), 350); }}
          onMouseLeave={() => { clearTimeout(hoverTimer.current); setTimeout(() => setPicker(false), 250); }}>
          {picker && (
            <div className="absolute bottom-full left-0 mb-1.5 flex gap-1 card shadow-card !rounded-full px-2 py-1.5 animate-pop z-30" role="menu">
              {REACTIONS.map((r) => (
                <button key={r.type} onClick={() => react(r.type)} title={r.label} aria-label={r.label}
                  className="text-2xl hover:scale-125 active:scale-95 transition-transform px-0.5">{r.emoji}</button>
              ))}
            </div>
          )}
          <button
            onClick={() => (pressTimer.current === 'fired' ? null : react(post.myReaction || 'like'))}
            onMouseDown={onPressStart} onMouseUp={onPressEnd} onTouchStart={onPressStart} onTouchEnd={onPressEnd}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="React" aria-pressed={!!post.myReaction}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition hover:bg-surface2 select-none ${my ? my.color : 'text-muted hover:text-ink'}`}
          >
            {my ? <span className="text-lg leading-none animate-pop" key={my.type}>{my.emoji}</span> : <ThumbsUp size={19} />}
            <span>{my ? my.label : 'Like'}</span>
          </button>
        </div>

        <button onClick={() => setShowComments((s) => !s)} aria-expanded={showComments}
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition hover:bg-surface2 ${showComments ? 'text-accent' : 'text-muted hover:text-ink'}`}>
          <MessageCircle size={19} /> <span>Comment</span>
        </button>
        <button onClick={share} className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold text-muted hover:text-ink hover:bg-surface2 transition">
          <Share2 size={18} /> <span className="hidden sm:inline">Share</span>
        </button>
        <button onClick={save} aria-pressed={post.saved} aria-label={post.saved ? 'Remove bookmark' : 'Save post'}
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition hover:bg-surface2 ${post.saved ? 'text-accent' : 'text-muted hover:text-ink'}`}>
          <Bookmark size={19} fill={post.saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {showComments && (
        <CommentsSection postId={post._id} autoFocus={!defaultOpenComments}
          onCount={(n) => onChange({ ...post, commentsCount: n })} />
      )}

      <ReportDialog postId={post._id} open={reportOpen} onClose={() => setReportOpen(false)} />
      {lightbox >= 0 && <Lightbox items={imageItems} index={lightbox} onClose={() => setLightbox(-1)} onIndex={setLightbox} />}
    </article>
  );
}
