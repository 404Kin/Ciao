import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Hash, Flame } from 'lucide-react';
import api from '../utils/api.js';
import { PageHeader, Tabs, EmptyState, Spinner } from '../components/ui.jsx';
import PostFeed, { usePosts } from '../components/PostFeed.jsx';
import UserRow from '../components/UserRow.jsx';
import { SearchBox, useTrending } from '../components/RightPanel.jsx';

function SearchResults({ q }) {
  const isTag = q.startsWith('#');
  const [tab, setTab] = useState('people');
  const [people, setPeople] = useState(null);
  const posts = usePosts(isTag ? { tag: q.slice(1) } : { q });

  useEffect(() => {
    if (isTag) return;
    setPeople(null);
    api.get('/users/search', { params: { q } }).then((r) => setPeople(r.data)).catch(() => setPeople([]));
  }, [q, isTag]);

  if (isTag) return <div className="p-4"><PostFeed state={posts} empty={<EmptyState emoji="🔎" title={`No posts for ${q}`} text="Try another tag." />} /></div>;
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'people', label: 'People' }, { id: 'posts', label: 'Posts' }]} />
      <div className="p-4">
        {tab === 'people' ? (
          people === null ? <div className="py-10 grid place-items-center"><Spinner /></div>
            : people.length === 0 ? <EmptyState emoji="🙈" title="No people found" text={`Nobody matches “${q}”.`} />
            : <div className="card px-4 py-2 divide-y divide-line">{people.map((u) => <UserRow key={u._id} user={u} />)}</div>
        ) : (
          <PostFeed state={posts} empty={<EmptyState emoji="🔎" title="No posts found" text={`Nothing matches “${q}”.`} />} />
        )}
      </div>
    </>
  );
}

export default function Explore() {
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const tags = useTrending();
  const popular = usePosts({ scope: 'popular' });

  return (
    <>
      <PageHeader title="Explore" />
      <div className="p-4 pb-0"><SearchBox /></div>
      {q ? <SearchResults key={q} q={q} /> : (
        <div className="p-4 space-y-5">
          {tags && tags.length > 0 && (
            <section>
              <h2 className="font-bold mb-2 flex items-center gap-2"><Hash size={17} className="text-accent" /> Trending tags</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => <Link key={t.tag} to={`/tag/${t.tag}`} className="chip hover:!text-accent hover:!border-accent transition">#{t.tag} · {t.count}</Link>)}
              </div>
            </section>
          )}
          <section>
            <h2 className="font-bold mb-3 flex items-center gap-2"><Flame size={17} className="text-orange-400" /> Popular right now</h2>
            <PostFeed state={popular} empty={<EmptyState emoji="🌱" title="Nothing popular yet" text="React and comment on posts to get things going." />} />
          </section>
        </div>
      )}
    </>
  );
}

export function TagPage() {
  const { tag } = useParams();
  const state = usePosts({ tag });
  return (
    <>
      <PageHeader back title={`#${tag}`} />
      <div className="p-4"><PostFeed state={state} empty={<EmptyState emoji="🔎" title={`No posts for #${tag}`} />} /></div>
    </>
  );
}
