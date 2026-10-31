import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../utils/api.js';
import PostCard from './PostCard.jsx';
import { EmptyState, PostSkeleton, Spinner } from './ui.jsx';

// Loads posts page by page for a given set of query params
export function usePosts(params) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [error, setError] = useState('');
  const reqId = useRef(0);
  const key = JSON.stringify(params);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/posts', { params: JSON.parse(key) });
      if (id !== reqId.current) return;
      setPosts(data.posts);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      if (id === reqId.current) setError(errMsg(err));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [key]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get('/posts', { params: { ...JSON.parse(key), before: cursor } });
      setPosts((p) => [...p, ...data.posts.filter((n) => !p.some((x) => x._id === n._id))]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const update = (id, updated) =>
    setPosts((p) => (updated === null ? p.filter((x) => x._id !== id) : p.map((x) => (x._id === id ? updated : x))));
  const prepend = (post) => setPosts((p) => [post, ...p.filter((x) => x._id !== post._id)]);

  return { posts, loading, loadingMore, hasMore, error, loadMore, reload: load, update, prepend, setPosts };
}

export default function PostFeed({ state, empty }) {
  const { posts, loading, loadingMore, hasMore, error, loadMore, reload, update } = state;
  const sentinel = useRef(null);

  // auto-load when scrolling near the bottom
  useEffect(() => {
    if (!hasMore || !sentinel.current) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { rootMargin: '400px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }); // eslint-disable-line

  if (loading) return <div className="space-y-4">{[0, 1, 2].map((i) => <PostSkeleton key={i} />)}</div>;
  if (error && !posts.length)
    return <EmptyState emoji="📡" title="Couldn't load posts" text={error} action={<button className="btn-primary btn-sm" onClick={reload}>Try again</button>} />;
  if (!posts.length) return empty || <EmptyState title="Nothing here yet" />;

  return (
    <div className="space-y-4">
      {posts.map((p) => <PostCard key={p._id} post={p} onChange={(u) => update(p._id, u)} />)}
      <div ref={sentinel} className="py-4 grid place-items-center min-h-10">
        {loadingMore ? <Spinner /> : hasMore ? (
          <button className="btn-ghost btn-sm" onClick={loadMore}>Load more</button>
        ) : <p className="text-xs text-muted">You're all caught up</p>}
      </div>
    </div>
  );
}
