import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Hash } from 'lucide-react';
import api from '../utils/api.js';
import UserRow from './UserRow.jsx';
import { Avatar } from './ui.jsx';

export function SearchBox({ className = '' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const term = q.trim();
    if (!term || term.startsWith('#')) { setResults([]); return; }
    const t = setTimeout(() => {
      api.get('/users/search', { params: { q: term } }).then((r) => setResults(r.data.slice(0, 5))).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    navigate(`/explore?q=${encodeURIComponent(term)}`);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <form onSubmit={submit}>
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Search people, posts, #tags" className="field !rounded-full !pl-11" aria-label="Search" />
      </form>
      {open && q.trim() && (
        <div className="absolute left-0 right-0 mt-2 card shadow-card p-2 z-40 animate-pop">
          {results.map((u) => (
            <Link key={u._id} to={`/u/${u.username}`} onClick={() => { setOpen(false); setQ(''); }} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface2">
              <Avatar user={u} size={34} />
              <span className="min-w-0"><span className="block text-sm font-semibold truncate">{u.name}</span><span className="block text-xs text-muted truncate">@{u.username}</span></span>
            </Link>
          ))}
          <button onClick={submit} className="w-full text-left p-2 rounded-xl hover:bg-surface2 text-sm text-accent font-semibold">
            Search for “{q.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}

export function useSuggestions() {
  const [people, setPeople] = useState(null);
  useEffect(() => { api.get('/users/suggestions').then((r) => setPeople(r.data)).catch(() => setPeople([])); }, []);
  return people;
}

export function useTrending() {
  const [tags, setTags] = useState(null);
  useEffect(() => { api.get('/posts/trending/tags').then((r) => setTags(r.data)).catch(() => setTags([])); }, []);
  return tags;
}

export default function RightPanel() {
  const people = useSuggestions();
  const tags = useTrending();
  return (
    <div className="sticky top-4 space-y-4">
      <SearchBox />
      <section className="card p-4">
        <h3 className="font-bold mb-1">Who to follow</h3>
        {people === null ? <div className="skeleton h-24 mt-2" />
          : people.length === 0 ? <p className="text-sm text-muted py-2">You're following everyone — wow! 🎉</p>
          : people.slice(0, 4).map((u) => <UserRow key={u._id} user={u} />)}
      </section>
      <section className="card p-4">
        <h3 className="font-bold mb-2 flex items-center gap-2"><TrendingUp size={16} className="text-accent" /> Trending tags</h3>
        {tags === null ? <div className="skeleton h-16" />
          : tags.length === 0 ? <p className="text-sm text-muted">Use #hashtags in your posts to start a trend.</p>
          : (
            <ul className="space-y-1">
              {tags.slice(0, 5).map((t) => (
                <li key={t.tag}>
                  <Link to={`/tag/${t.tag}`} className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-surface2">
                    <span className="flex items-center gap-1.5 font-semibold text-sm"><Hash size={14} className="text-accent" />{t.tag}</span>
                    <span className="text-xs text-muted">{t.count} post{t.count === 1 ? '' : 's'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </section>
      <p className="text-xs text-muted px-2">© {new Date().getFullYear()} Ciao · made with 💜</p>
    </div>
  );
}
