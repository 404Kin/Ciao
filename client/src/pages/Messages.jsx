import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SquarePen, Send } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar, EmptyState, Modal, PageHeader, Spinner } from '../components/ui.jsx';
import PeoplePicker from '../components/PeoplePicker.jsx';
import { timeAgo } from '../utils/format.js';

export default function Messages() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [picker, setPicker] = useState(false);

  const load = useCallback(() => {
    api.get('/messages/conversations').then((r) => setItems(r.data)).catch((e) => { setItems((p) => p || []); toast.error(errMsg(e)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => !document.hidden && load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  const start = async (u) => {
    try {
      const { data } = await api.post('/messages/conversations', { userId: u._id });
      setPicker(false);
      navigate(`/messages/${data.conversation._id}`);
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <PageHeader title="Messages" right={<button className="icon-btn" onClick={() => setPicker(true)} aria-label="New message"><SquarePen size={20} /></button>} />
      <div>
        {items === null ? <div className="py-16 grid place-items-center"><Spinner /></div>
          : items.length === 0 ? (
            <EmptyState icon="send" title="Your messages" text="Send a private message to a friend."
              action={<button className="btn-primary btn-sm" onClick={() => setPicker(true)}><Send size={14} /> Send message</button>} />
          ) : (
            <ul className="divide-y divide-line">
              {items.map((c) => (
                <li key={c._id}>
                  <Link to={`/messages/${c._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface2 transition">
                    <Avatar user={c.user} size={52} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${c.unread ? 'font-bold' : 'font-medium'}`}>{c.user.name}</p>
                      <p className={`text-sm truncate ${c.unread ? 'text-ink font-semibold' : 'text-muted'}`}>
                        {c.lastMine ? 'You: ' : ''}{c.lastText} <span className="text-muted font-normal">· {timeAgo(c.lastAt)}</span>
                      </p>
                    </div>
                    {c.unread > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-white text-xs font-bold grid place-items-center">{c.unread}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </div>
      <Modal open={picker} onClose={() => setPicker(false)} title="New message" size="sm">
        <PeoplePicker onPick={start} />
      </Modal>
    </>
  );
}
