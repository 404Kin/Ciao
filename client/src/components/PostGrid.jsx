import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Layers, Play, Music } from 'lucide-react';
import { mediaUrl } from '../utils/api.js';
import { EmptyState, Spinner } from './ui.jsx';

// Instagram-style grid of square tiles
export default function PostGrid({ state, empty }) {
  const { posts, loading, loadingMore, hasMore, loadMore, error, reload } = state;
  if (loading) return <div className="py-16 grid place-items-center"><Spinner size={24} /></div>;
  if (error && !posts.length)
    return <EmptyState icon="wifi" title="Couldn't load posts" text={error} action={<button className="btn-primary btn-sm" onClick={reload}>Try again</button>} />;
  if (!posts.length) return empty || <EmptyState title="No posts yet" />;

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {posts.map((p) => {
          const first = p.media[0];
          return (
            <Link key={p._id} to={`/post/${p._id}`} className="group relative aspect-square bg-surface2 overflow-hidden block" aria-label="Open post">
              {first?.type === 'image' && <img src={mediaUrl(first.url)} alt="" loading="lazy" className="w-full h-full object-cover" />}
              {first?.type === 'video' && <video src={mediaUrl(first.url)} muted preload="metadata" playsInline className="w-full h-full object-cover" />}
              {!first && (
                <div className="w-full h-full p-3 flex items-center justify-center text-center">
                  {p.song && !p.text ? <Music size={28} className="text-muted" /> : <p className="text-[13px] leading-snug line-clamp-4 break-words">{p.text}</p>}
                </div>
              )}
              <span className="absolute top-1.5 right-1.5 text-white drop-shadow">
                {p.media.length > 1 ? <Layers size={16} /> : first?.type === 'video' ? <Play size={16} fill="currentColor" /> : null}
              </span>
              <span className="absolute inset-0 bg-black/40 text-white font-semibold text-sm hidden group-hover:flex items-center justify-center gap-5">
                <span className="flex items-center gap-1.5"><Heart size={17} fill="currentColor" /> {p.reactionsTotal}</span>
                <span className="flex items-center gap-1.5"><MessageCircle size={17} fill="currentColor" /> {p.commentsCount}</span>
              </span>
            </Link>
          );
        })}
      </div>
      {hasMore && (
        <div className="py-5 grid place-items-center">
          {loadingMore ? <Spinner /> : <button className="btn-ghost btn-sm" onClick={loadMore}>Load more</button>}
        </div>
      )}
    </>
  );
}
