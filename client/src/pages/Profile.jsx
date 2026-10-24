import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Link2, Calendar, Settings as Cog, Image as ImageIcon, FileText, Bookmark } from 'lucide-react';
import api, { errMsg, mediaUrl } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, PageHeader, Tabs, EmptyState, Modal, Spinner, PostSkeleton } from '../components/ui.jsx';
import FollowButton from '../components/FollowButton.jsx';
import UserRow from '../components/UserRow.jsx';
import PostFeed, { usePosts } from '../components/PostFeed.jsx';
import { gradientFor, compact } from '../utils/format.js';

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

export default function Profile() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(undefined);
  const [tab, setTab] = useState('posts');
  const [conn, setConn] = useState(null);
  const [viewer, setViewer] = useState(false);

  useEffect(() => {
    setProfile(undefined);
    setTab('posts');
    api.get(`/users/${username}`).then((r) => setProfile(r.data)).catch((e) => setProfile(e.response?.status === 404 ? null : null));
  }, [username]);

  const posts = usePosts({ scope: tab === 'media' ? 'media' : 'all', user: username });

  // keep the post counter in sync when posts are created/deleted
  useEffect(() => {
    if (profile) setProfile((p) => (p ? { ...p, postsCount: tab === 'posts' ? posts.posts.length : p.postsCount } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.posts.length]);

  if (profile === undefined) return <><PageHeader back title="Profile" /><div className="p-4"><PostSkeleton /></div></>;
  if (profile === null) return <><PageHeader back title="Profile" /><div className="p-4"><EmptyState emoji="🫥" title="User not found" text={`There is no @${username} on Ciao.`} /></div></>;

  const isMe = profile.isMe || me?.username === profile.username;
  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader back title={profile.name} subtitle={`${compact(profile.postsCount)} posts`} />

      {/* cover */}
      <div className="h-36 sm:h-48 w-full relative" style={profile.cover ? undefined : { background: gradientFor(profile.username) }}>
        {profile.cover && <img src={mediaUrl(profile.cover)} alt="" className="w-full h-full object-cover" />}
      </div>

      <div className="px-4">
        <div className="relative z-10 flex items-end justify-between -mt-12 sm:-mt-14">
          <button onClick={() => (profile.avatarUrl ? setViewer(true) : null)} className="rounded-full border-4 border-bg bg-bg" aria-label="View profile photo">
            <Avatar user={profile} size={104} />
          </button>
          <div className="pb-1 flex gap-2">
            {isMe ? (
              <Link to="/settings" className="btn-ghost btn-sm"><Cog size={14} /> Edit profile</Link>
            ) : (
              <FollowButton userId={profile._id} initial={profile.isFollowing} size="md"
                onChange={(d) => setProfile((p) => ({ ...p, isFollowing: d.following, followersCount: d.followersCount }))} />
            )}
          </div>
        </div>

        <div className="mt-3">
          <h2 className="text-xl font-extrabold leading-tight">{profile.name}</h2>
          <p className="text-muted text-sm">@{profile.username}</p>
          {profile.status && <p className="chip mt-2">{profile.status}</p>}
          {profile.bio && <p className="mt-3 whitespace-pre-wrap break-words">{profile.bio}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted">
            {profile.location && <span className="flex items-center gap-1"><MapPin size={14} />{profile.location}</span>}
            {profile.website && <a href={profile.website} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 text-accent hover:underline"><Link2 size={14} />{profile.website.replace(/^https?:\/\//, '')}</a>}
            <span className="flex items-center gap-1"><Calendar size={14} />Joined {joined}</span>
          </div>
          <div className="flex gap-5 mt-3 text-sm">
            <button onClick={() => setConn('following')} className="hover:underline"><b>{compact(profile.followingCount)}</b> <span className="text-muted">Following</span></button>
            <button onClick={() => setConn('followers')} className="hover:underline"><b>{compact(profile.followersCount)}</b> <span className="text-muted">Followers</span></button>
            {isMe && <Link to="/saved" className="hover:underline flex items-center gap-1 text-muted"><Bookmark size={14} /> Saved</Link>}
          </div>
        </div>
      </div>

      <Tabs className="mt-4" value={tab} onChange={setTab} tabs={[{ id: 'posts', label: 'Posts', icon: FileText }, { id: 'media', label: 'Photos & videos', icon: ImageIcon }]} />
      <div className="p-4">
        <PostFeed state={posts} empty={<EmptyState emoji={tab === 'media' ? '📷' : '📝'} title={tab === 'media' ? 'No photos or videos yet' : 'No posts yet'}
          text={isMe ? 'Share something from the Home page!' : `${profile.name} hasn't posted yet.`}
          action={isMe && <button className="btn-primary btn-sm" onClick={() => navigate('/')}>Create a post</button>} />} />
      </div>

      <ConnectionsModal username={profile.username} kind={conn} onClose={() => setConn(null)} />
      {viewer && (
        <div className="fixed inset-0 z-[95] bg-black/90 grid place-items-center p-4" onClick={() => setViewer(false)}>
          <img src={mediaUrl(profile.avatarUrl)} alt="" className="max-w-full max-h-[85vh] rounded-3xl object-contain" />
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
