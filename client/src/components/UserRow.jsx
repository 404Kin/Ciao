import { Link } from 'react-router-dom';
import { Avatar } from './ui.jsx';
import FollowButton from './FollowButton.jsx';

export default function UserRow({ user, showFollow = true, onNavigate }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Link to={`/u/${user.username}`} onClick={onNavigate} className="flex items-center gap-3 min-w-0 flex-1 group">
        <Avatar user={user} size={42} />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate group-hover:underline">{user.name}</p>
          <p className="text-xs text-muted truncate">@{user.username}</p>
        </div>
      </Link>
      {showFollow && !user.isMe && <FollowButton userId={user._id} initial={user.isFollowing} />}
    </div>
  );
}
