import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Link2, Calendar, LayoutGrid, List, Bookmark, Send } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, PageHeader, Tabs, EmptyState, Modal, Spinner, PostSkeleton } from '../components/ui.jsx';
import FollowButton from '../components/FollowButton.jsx';
import UserRow from '../components/UserRow.jsx';
import PostFeed, { usePosts } from '../components/PostFeed.jsx';
import PostGrid from '../components/PostGrid.jsx';
import { compact } from '../utils/format.js';
import { mediaUrl } from '../utils/api.js';

function ConnectionsModal({ username, kind, onClose }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    if (!kind) return;
    setList(null);
    api.get(`/users/${username}/${kind}`).then((r) => setList(r.data)).catch(() => setList([]));
  }, [kind, username]);
  return (
    <Modal open={!!kind} onClose={onClose} title={kind === 'followers' ? 'Followers' : 'Following'} size="sm">
      {list === null ? <div className="py-8 grid place-items-center"><Spinner /></div>
        : list.length === 0 ? <p className="text-center text-muted text-sm py-6">Nobody here yet.</p>
        : list.map((u) => <UserRow key={u._id} user={u} onNavigate={onClose} />)}
    </Modal>
  );
}

function Stat({ n, label, onClick }) {
  const inner = <><b className="font-semibold">{compact(n)}</b> <span className="text-muted sm:text-ink">{label}</span></>;
  return onClick
    ? <button onClick={onClick} className="hover:opacity-70 text-center sm:text-left">{inner}</button>
    : <span className="text-center sm:text-left">{inner}</span>;
}

export default function Profile() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState(undefined);
  const [tab, setTab] = useState('grid');
  const [conn, setConn] = useState(null);
  const [viewer, setViewer] = useState(false);

  useEffect(() => {
    setProfile(undefined);
    setTab('grid');
    api.get(`/users/${username}`).then((r) => setProfile(r.data)).catch(() => setProfile(null));
  }, [username]);

  const posts = usePosts({ scope: 'all', user: username });

  if (profile === undefined) return <><PageHeader back title="Profile" /><div className="p-4"><PostSkeleton /></div></>;
  if (profile === null) return <><PageHeader back title="Profile" /><div className="p-4"><EmptyState icon="user" title="User not found" text={`There is no @${username} on Ciao.`} /></div></>;

  const isMe = profile.isMe || me?.username === profile.username;
  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const postsCount = posts.loading ? profile.postsCount : posts.posts.length + (posts.hasMore ? 0 : 0) || profile.postsCount;

  const startChat = async () => {
    try {
      const { data } = await api.post('/messages/conversations', { userId: profile._id });
      navigate(`/messages/${data.conversation._id}`);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const actions = isMe ? (
    <Link to="/settings" className="btn-ghost btn-sm">Edit profile</Link>
  ) : (
    <>
      <FollowButton userId={profile._id} initial={profile.isFollowing}
        onChange={(d) => setProfile((p) => ({ ...p, isFollowing: d.following, followersCount: d.followersCount }))} />
      <button className="btn-ghost btn-sm" onClick={startChat}><Send size={14} /> Message</button>
    </>
  );

  return (
    <>
      <PageHeader back title={profile.username} />

      <div className="px-4 pt-6">
        <div className="flex items-center gap-5 sm:gap-10">
          <button onClick={() => (profile.avatarUrl ? setViewer(true) : null)} className="shrink-0 rounded-full" aria-label="View profile photo">
            <Avatar user={profile} size={88} className="sm:!w-[128px] sm:!h-[128px] sm:!min-w-[128px]" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="text-xl font-medium truncate">{profile.username}</h2>
              {actions}
            </div>
            <div className="hidden sm:flex gap-8 mt-4 text-[15px]">
              <Stat n={postsCount} label="posts" />
              <Stat n={profile.followersCount} label="followers" onClick={() => setConn('followers')} />
              <Stat n={profile.followingCount} label="following" onClick={() => setConn('following')} />
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm">
          <p className="font-semibold">{profile.name}</p>
          {profile.status && <p className="text-muted">{profile.status}</p>}
          {profile.bio && <p className="mt-1 whitespace-pre-wrap break-words">{profile.bio}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-muted text-[13px]">
            {profile.location && <span className="flex items-center gap-1"><MapPin size={13} />{profile.location}</span>}
            {profile.website && <a href={profile.website} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 text-accent hover:underline"><Link2 size={13} />{profile.website.replace(/^https?:\/\//, '')}</a>}
            <span className="flex items-center gap-1"><Calendar size={13} />Joined {joined}</span>
          </div>
        </div>

        <div className="sm:hidden grid grid-cols-3 border-y border-line mt-4 py-3 text-sm">
          <Stat n={postsCount} label="posts" />
          <Stat n={profile.followersCount} label="followers" onClick={() => setConn('followers')} />
          <Stat n={profile.followingCount} label="following" onClick={() => setConn('following')} />
        </div>
      </div>

      <Tabs className="mt-2 sm:mt-6" value={tab} onChange={setTab}
        tabs={[{ id: 'grid', label: 'Posts', icon: LayoutGrid }, { id: 'list', label: 'Timeline', icon: List }, ...(isMe ? [{ id: 'saved', label: 'Saved', icon: Bookmark }] : [])]} />

      {tab === 'saved' ? (
        <div className="p-6 text-center">
          <Link to="/saved" className="btn-primary btn-sm">Open saved posts</Link>
        </div>
      ) : tab === 'grid' ? (
        <div className="px-0.5 sm:px-0 pt-1">
          <PostGrid state={posts} empty={<EmptyState icon="image" title={isMe ? 'Share your first post' : 'No posts yet'}
            text={isMe ? 'Photos, videos and thoughts you share will show up here.' : `${profile.name} hasn't posted yet.`}
            action={isMe && <button className="btn-primary btn-sm" onClick={() => navigate('/')}>Create a post</button>} />} />
        </div>
      ) : (
        <div className="p-4">
          <PostFeed state={posts} empty={<EmptyState icon="file" title="No posts yet" />} />
        </div>
      )}

      <ConnectionsModal username={profile.username} kind={conn} onClose={() => setConn(null)} />
      {viewer && (
        <div className="fixed inset-0 z-[95] bg-black/90 grid place-items-center p-4" onClick={() => setViewer(false)}>
          <img src={mediaUrl(profile.avatarUrl)} alt="" className="max-w-full max-h-[85vh] rounded-full object-cover aspect-square" />
        </div>
      )}
    </>
  );
}

export function MyProfileRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { navigate(`/u/${user.username}`, { replace: true }); }, [user.username, navigate]);
  return null;
}
