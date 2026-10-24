import { useState } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function FollowButton({ userId, initial = false, onChange, size = 'sm', className = '' }) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const was = following;
    setFollowing(!was); // optimistic
    try {
      const { data } = await api.post(`/users/follow/${userId}`);
      setFollowing(data.following);
      onChange?.(data);
    } catch (err) {
      setFollowing(was);
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const sz = size === 'sm' ? 'btn-sm' : '';
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`${following ? 'btn-ghost' : 'btn-primary'} ${sz} ${className}`}
    >
      {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
