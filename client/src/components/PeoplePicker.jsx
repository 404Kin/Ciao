import { useEffect, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './ui.jsx';

// Pick people (search anyone, or choose from the people you follow)
export default function PeoplePicker({ selected, onChange, max = 20 }) {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    api.get(`/users/${me.username}/following`).then((r) => setFollowing(r.data)).catch(() => {});
  }, [me.username]);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); return; }
    const t = setTimeout(() => {
      api.get('/users/search', { params: { q: term } }).then((r) => setResults(r.data.filter((u) => !u.isMe))).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const has = (u) => selected.some((s) => s._id === u._id);
  const toggle = (u) => {
    if (has(u)) onChange(selected.filter((s) => s._id !== u._id));
    else if (selected.length < max) onChange([...selected, u]);
  };
  const list = q.trim() ? results : following;

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span key={u._id} className="chip !bg-accent/15 !border-accent/40 !text-ink gap-1.5 !pl-1.5">
              <Avatar user={u} size={18} /> @{u.username}
              <button type="button" onClick={() => toggle(u)} aria-label={`Remove ${u.username}`} className="hover:text-danger"><X size={13} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field !pl-10" placeholder="Search people to tag…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" />
      </div>
      <div className="max-h-44 overflow-y-auto rounded-2xl border border-line divide-y divide-line">
        {list.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">{q.trim() ? 'No one found' : 'Search for someone, or follow people to see them here'}</p>
        ) : list.map((u) => (
          <button type="button" key={u._id} onClick={() => toggle(u)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface2 text-left">
            <Avatar user={u} size={32} />
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{u.name}</span><span className="block text-xs text-muted truncate">@{u.username}</span></span>
            <span className={`w-5 h-5 rounded-full border-2 grid place-items-center ${has(u) ? 'bg-accent border-accent text-white' : 'border-line'}`}>{has(u) && <Check size={12} />}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">{selected.length}/{max} tagged · only tagged people can add to the chain</p>
    </div>
  );
}
