import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Trash2, UserPlus, MessageCircle, Heart, Link2, TriangleAlert } from 'lucide-react';
import api, { errMsg, mediaUrl } from '../utils/api.js';
import { PageHeader, EmptyState, Avatar, Spinner, useConfirm } from '../components/ui.jsx';
import { useNotifs } from '../components/AppShell.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { reactionOf, timeAgo } from '../utils/format.js';

const describe = (n) => {
  switch (n.type) {
    case 'reaction': return { icon: <span>{reactionOf(n.meta)?.emoji || '👍'}</span>, text: `reacted to your post` };
    case 'comment': return { icon: <MessageCircle size={14} />, text: 'commented on your post' };
    case 'reply': return { icon: <MessageCircle size={14} />, text: 'replied to your comment' };
    case 'comment_like': return { icon: <Heart size={13} fill="currentColor" />, text: 'liked your comment' };
    case 'warning': return { icon: <TriangleAlert size={14} />, text: 'Notice from the Ciao team', notice: true };
    case 'chain_invite': return { icon: <Link2 size={14} />, text: 'tagged you in a chain' };
    case 'chain_add': return { icon: <Link2 size={14} />, text: 'added to your chain' };
    case 'chain_done': return { icon: <Link2 size={14} />, text: 'finished a chain. The collage is ready' };
    case 'follow': return { icon: <UserPlus size={14} />, text: 'started following you' };
    default: return { icon: <Bell size={14} />, text: 'interacted with you' };
  }
};

export default function Notifications() {
  const [items, setItems] = useState(null);
  const { clear } = useNotifs();
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    api.get('/notifications')
      .then(async (r) => {
        setItems(r.data);
        if (r.data.some((n) => !n.read)) {
          await api.post('/notifications/read-all').catch(() => {});
          clear();
        }
      })
      .catch((e) => { setItems([]); toast.error(errMsg(e)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAll = async () => {
    if (!(await confirm({ title: 'Clear notifications?', message: 'All notifications will be removed.', confirmText: 'Clear all', danger: true }))) return;
    try { await api.delete('/notifications'); setItems([]); clear(); toast.success('Cleared'); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title="Notifications"
        right={items?.length > 0 && <button className="btn-ghost btn-sm" onClick={clearAll}><Trash2 size={13} /> Clear all</button>} />
      <div className="p-4">
        {items === null ? <div className="py-16 grid place-items-center"><Spinner /></div>
          : items.length === 0 ? <EmptyState emoji="🔔" title="You're all caught up" text="Reactions, comments and new followers will show up here." />
          : (
            <ul className="card divide-y divide-line overflow-hidden">
              {items.map((n) => {
                const d = describe(n);
                const to = n.chain ? `/chain/${n.chain._id}` : n.type === 'follow' ? `/u/${n.actor.username}` : n.post ? `/post/${n.post._id}` : `/u/${n.actor.username}`;
                return (
                  <li key={n._id}>
                    <Link to={to} className={`flex items-start gap-3 p-4 hover:bg-surface2 transition ${n.read ? '' : 'bg-accent/5'}`}>
                      <div className="relative">
                        <Avatar user={n.actor} size={44} />
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full gradient-accent text-white grid place-items-center text-xs border-2 border-surface">{d.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        {d.notice ? (
                          <><p className="text-sm font-bold">{d.text}</p><p className="text-sm text-ink/90 mt-0.5 break-words">{n.meta} <Link to="/guidelines" className="text-accent hover:underline">Guidelines</Link></p></>
                        ) : <p className="text-sm"><b>{n.actor.name}</b> <span className="text-muted">{d.text}</span></p>}
                        {(n.type === 'comment' || n.type === 'reply') && n.meta && <p className="text-sm text-ink/80 line-clamp-2 mt-0.5">“{n.meta}”</p>}
                        {n.chain?.title && <p className="text-sm text-ink/80 truncate mt-0.5">“{n.chain.title}”</p>}
                        {n.post?.text && n.type !== 'comment' && n.type !== 'reply' && <p className="text-xs text-muted truncate mt-0.5">{n.post.text}</p>}
                        <p className="text-xs text-muted mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {n.post?.thumb && <img src={mediaUrl(n.post.thumb)} alt="" className="w-12 h-12 rounded-xl object-cover" />}
                      {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-accent mt-2" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </>
  );
}
