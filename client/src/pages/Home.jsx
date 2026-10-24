import { useEffect, useState } from 'react';
import { Users, Globe2 } from 'lucide-react';
import { PageHeader, Tabs, EmptyState } from '../components/ui.jsx';
import Composer from '../components/Composer.jsx';
import PostFeed, { usePosts } from '../components/PostFeed.jsx';
import { useSuggestions } from '../components/RightPanel.jsx';
import UserRow from '../components/UserRow.jsx';

export default function Home() {
  const [tab, setTab] = useState(() => localStorage.getItem('ciao_home_tab') || 'all');
  const state = usePosts({ scope: tab });
  const people = useSuggestions();

  useEffect(() => localStorage.setItem('ciao_home_tab', tab), [tab]);

  // posts created from the "New post" modal
  useEffect(() => {
    const onNew = (e) => state.prepend(e.detail);
    window.addEventListener('ciao:new-post', onNew);
    return () => window.removeEventListener('ciao:new-post', onNew);
  });

  return (
    <>
      <PageHeader title="Home" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'For you', icon: Globe2 }, { id: 'following', label: 'Following', icon: Users }]} />
      <div className="p-4 space-y-4">
        <Composer onPosted={(p) => state.prepend(p)} />
        {/* on small screens the right panel is hidden, so show suggestions inline */}
        {people && people.length > 0 && (
          <section className="card p-4 xl:hidden">
            <h3 className="font-bold mb-1">People you may know</h3>
            {people.slice(0, 3).map((u) => <UserRow key={u._id} user={u} />)}
          </section>
        )}
        <PostFeed
          state={state}
          empty={
            <EmptyState emoji={tab === 'following' ? '🫶' : '✨'}
              title={tab === 'following' ? 'Your following feed is empty' : 'No posts yet'}
              text={tab === 'following' ? 'Follow some people to see their posts here, or switch to “For you”.' : 'Be the first to post something!'}
              action={tab === 'following' && <button className="btn-primary btn-sm" onClick={() => setTab('all')}>Show everyone</button>} />
          }
        />
      </div>
    </>
  );
}
