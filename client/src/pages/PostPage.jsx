import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../utils/api.js';
import { PageHeader, EmptyState, PostSkeleton } from '../components/ui.jsx';
import PostCard from '../components/PostCard.jsx';

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    setPost(undefined);
    api.get(`/posts/${id}`).then((r) => setPost(r.data)).catch((e) => { setPost(null); setError(errMsg(e)); });
  }, [id]);

  return (
    <>
      <PageHeader back title="Post" />
      <div className="p-4">
        {post === undefined ? <PostSkeleton />
          : post === null ? <EmptyState emoji="🫥" title="Post not found" text={error || 'It may have been deleted.'} />
          : <PostCard post={post} defaultOpenComments onChange={(u) => (u === null ? navigate('/') : setPost(u))} />}
      </div>
    </>
  );
}
