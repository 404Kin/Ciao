import { PageHeader, EmptyState } from '../components/ui.jsx';
import PostFeed, { usePosts } from '../components/PostFeed.jsx';

export default function Saved() {
  const state = usePosts({ scope: 'saved' });
  // un-saving a post here removes it from the list
  const wrapped = {
    ...state,
    update: (id, u) => state.update(id, u && u.saved === false ? null : u),
  };
  return (
    <>
      <PageHeader title="Saved" subtitle="Posts you bookmarked" />
      <div className="p-4">
        <PostFeed state={wrapped} empty={<EmptyState emoji="🔖" title="No saved posts" text="Tap the bookmark icon on any post to keep it here." />} />
      </div>
    </>
  );
}
