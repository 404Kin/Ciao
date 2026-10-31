import { useEffect, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar, Spinner } from './ui.jsx';

// Pick people to tag. With nothing typed it lists people you follow plus other people on Ciao,
// typing searches everyone by name or username.
export default function PeoplePicker({ selected = [], onChange, onPick, max = 20 }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [base, setBase] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get(`/users/${me.username}/following`).then((r) => r.data).catch(() => []),
      api.get('/users/suggestions').then((r) => r.data).catch(() => []),
    ]).then(([following, suggestions]) => {
      if (!alive) return;
      const seen = new Set();
      setBase([...following, ...suggestions].filter((u) => u._id !== me._id && !seen.has(u._id) && seen.add(u._id)));
    });
    return () => { alive = false; };
  }, [me.username, me._id]);

  useEffect(() => {
    const term = q.trim().replace(/^@/, '');
    if (!term) { setResults([]); setSearching(false); return; }
    setSearching(true);
    let alive = true;
    const t = setTimeout(() => {
      api.get('/users/search', { params: { q: term } })
        .then((r) => alive && setResults(r.data.filter((u) => u._id !== me._id)))
        .catch((e) => { if (alive) { setResults([]); toast.error(errMsg(e)); } })
        .finally(() => alive && setSearching(false));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const has = (u) => selected.some((s) => s._id === u._id);
  const toggle = (u) => {
    if (onPick) { onPick(u); return; }
    if (has(u)) onChange(selected.filter((s) => s._id !== u._id));
    else if (selected.length >= max) toast.info(`You can tag up to ${max} people`);
    else onChange([...selected, u]);
  };
  const list = q.trim() ? results : base || [];

  // Enter must pick the first match, NOT submit the whole "start chain" form
  const onKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const first = list.find((u) => !has(u));
    if (first) { toggle(first); if (!onPick) setQ(''); }
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span key={u._id} className="chip !bg-accent/10 !border-accent/40 !text-ink gap-1.5 !pl-1.5">
              <Avatar user={u} size={18} /> @{u.username}
              <button type="button" onClick={() => toggle(u)} aria-label={`Remove ${u.username}`} className="hover:text-danger"><X size={13} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field !pl-10" placeholder="Search by name or username" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} aria-label="Search people" />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-line divide-y divide-line">
        {base === null || searching ? (
          <div className="py-5 grid place-items-center"><Spinner /></div>
        ) : list.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">{q.trim() ? `Nobody found for “${q.trim()}”` : 'No other people on Ciao yet'}</p>
        ) : list.map((u) => (
          <button type="button" key={u._id} onClick={() => toggle(u)} aria-pressed={has(u)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface2 text-left">
            <Avatar user={u} size={34} />
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{u.name}</span><span className="block text-xs text-muted truncate">@{u.username}</span></span>
            {!onPick && <span className={`w-5 h-5 rounded-full border-2 grid place-items-center ${has(u) ? 'bg-accent border-accent text-white' : 'border-line'}`}>{has(u) && <Check size={12} />}</span>}
          </button>
        ))}
      </div>
      {!onPick && <p className="text-[11px] text-muted">{selected.length === 0 ? 'Tap a person to tag them.' : `${selected.length} tagged`} Only tagged people can add to the chain.</p>}
    </div>
  );
}
