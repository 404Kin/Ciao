import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Trash2, Sun, Moon, Monitor, Check, LogOut, Lock, User as UserIcon, Palette, Volume2, Loader2 } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ACCENTS, useTheme } from '../context/ThemeContext.jsx';
import { useMusic } from '../context/MusicContext.jsx';
import { Avatar, PageHeader, Tabs, Modal, useConfirm } from '../components/ui.jsx';
import { AVATAR_PRESETS, presetValue } from '../utils/avatars.js';
import ImageCropper from '../components/ImageCropper.jsx';

function ProfileTab() {
  const { user, patchUser } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [cropFile, setCropFile] = useState(null);
  const [form, setForm] = useState({
    name: user.name || '', username: user.username || '', bio: user.bio || '', status: user.status || '',
    location: user.location || '', website: user.website || '',
  });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const uploadPhoto = async (file) => {
    if (file.size > 8 * 1024 * 1024) return toast.error('Image is too large (max 8 MB)');
    const fd = new FormData();
    fd.append('avatar', file);
    setBusy(true);
    try {
      const { data } = await api.post('/users/me/avatar', fd);
      patchUser({ avatarUrl: data.avatarUrl });
      toast.success('Profile photo updated');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const removePhoto = async () => {
    setBusy(true);
    try {
      await api.delete('/users/me/avatar');
      patchUser({ avatarUrl: '' });
      toast.success('Photo removed');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const pickPreset = async (id) => {
    try {
      if (user.avatarUrl) {
        const ok = await confirm({ title: 'Use this avatar?', message: 'Your uploaded profile photo will be replaced by this avatar.', confirmText: 'Use avatar' });
        if (!ok) return;
        await api.delete('/users/me/avatar');
      }
      await api.patch('/users/me', { avatar: presetValue(id) });
      patchUser({ avatar: presetValue(id), avatarUrl: '' });
    } catch (err) { toast.error(errMsg(err)); }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', form);
      patchUser(data);
      setForm({ name: data.name, username: data.username, bio: data.bio, status: data.status, location: data.location, website: data.website });
      toast.success('Profile saved');
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <Avatar user={user} size={80} />
          <div className="min-w-0">
            <p className="font-bold truncate">{user.username}</p>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && !f.type.startsWith('image/')) toast.error('Please choose an image file'); else if (f) setCropFile(f); e.target.value = ''; }} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <button type="button" className="text-accent text-sm font-semibold hover:underline" onClick={() => fileInput.current?.click()} disabled={busy}>
                {busy ? 'Working…' : 'Change profile photo'}
              </button>
              {user.avatarUrl && <button type="button" className="text-danger text-sm font-semibold hover:underline" onClick={removePhoto} disabled={busy}>Remove</button>}
            </div>
          </div>
        </div>
        {AVATAR_PRESETS.length > 0 && (
          <>
            <p className="text-xs text-muted mt-5 mb-2">Or choose an avatar</p>
            <div className="flex flex-wrap gap-2.5">
              {AVATAR_PRESETS.map((a) => {
                const active = !user.avatarUrl && user.avatar === presetValue(a.id);
                return (
                  <button type="button" key={a.id} onClick={() => pickPreset(a.id)} aria-pressed={active} aria-label={`Avatar ${a.id}`}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition hover:opacity-90 ${active ? 'border-accent' : 'border-transparent'}`}>
                    <img src={a.url} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-bold">Profile details</h3>
        <label className="block"><span className="text-xs font-semibold text-muted">Name</span>
          <input className="field mt-1" value={form.name} onChange={set('name')} maxLength={40} required /></label>
        <label className="block"><span className="text-xs font-semibold text-muted">Username</span>
          <div className="relative mt-1"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">@</span>
            <input className="field !pl-8" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} maxLength={20} required /></div></label>
        <label className="block"><span className="text-xs font-semibold text-muted">Status</span>
          <input className="field mt-1" placeholder="What are you up to?" value={form.status} onChange={set('status')} maxLength={80} /></label>
        <label className="block"><span className="text-xs font-semibold text-muted">Bio <span className="font-normal">({form.bio.length}/200)</span></span>
          <textarea className="field mt-1 resize-none" rows={3} value={form.bio} onChange={set('bio')} maxLength={200} /></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="text-xs font-semibold text-muted">Location</span>
            <input className="field mt-1" placeholder="City, Country" value={form.location} onChange={set('location')} maxLength={60} /></label>
          <label className="block"><span className="text-xs font-semibold text-muted">Website</span>
            <input className="field mt-1" placeholder="example.com" value={form.website} onChange={set('website')} maxLength={100} /></label>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : null} Save</button>
        </div>
      </div>
      <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(f) => { setCropFile(null); uploadPhoto(f); }} />
    </form>
  );
}

function AppearanceTab() {
  const { theme, setTheme, accent, setAccent } = useTheme();
  const { volume, setVolume } = useMusic();
  const modes = [['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'Device', Monitor]];
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-bold mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {modes.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTheme(id)} aria-pressed={theme === id}
              className={`rounded-lg border p-4 flex flex-col items-center gap-2 transition ${theme === id ? 'border-accent bg-accent/10 text-accent' : 'border-line hover:bg-surface2'}`}>
              <Icon size={20} /><span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3">Accent colour</h3>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button key={a.id} onClick={() => setAccent(a.id)} title={a.label} aria-label={a.label} aria-pressed={accent === a.id}
              className="w-10 h-10 rounded-full grid place-items-center text-white transition hover:scale-105" style={{ background: a.color }}>
              {accent === a.id && <Check size={18} />}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Volume2 size={16} /> Music volume</h3>
        <input type="range" className="seek w-full" min={0} max={1} step="0.01" value={volume} style={{ '--p': `${volume * 100}%` }} onChange={(e) => setVolume(parseFloat(e.target.value))} aria-label="Default volume" />
        <p className="text-xs text-muted mt-2">{Math.round(volume * 100)}%. Saved on this device.</p>
      </div>
    </div>
  );
}

function AccountTab() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [deleting, setDeleting] = useState(false);

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast.error('New passwords do not match');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password updated');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const doLogout = async () => {
    if (await confirm({ title: 'Log out?', message: 'You can log back in any time.', confirmText: 'Log out' })) { logout(); navigate('/login'); }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await api.delete('/auth/account', { data: { password: delPw } });
      toast.success('Your account was deleted');
      logout(); navigate('/register');
    } catch (err) { toast.error(errMsg(err)); setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-bold mb-1">Account</h3>
        <p className="text-sm text-muted">Signed in as <b className="text-ink">{user.email}</b></p>
        <button className="btn-ghost btn-sm mt-4" onClick={doLogout}><LogOut size={14} /> Log out</button>
      </div>

      <form onSubmit={changePw} className="card p-5 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><Lock size={16} /> Change password</h3>
        <input className="field" type="password" placeholder="Current password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" required />
        <input className="field" type="password" placeholder="New password (min 6)" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" minLength={6} required />
        <input className="field" type="password" placeholder="Confirm new password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" required />
        <div className="flex justify-end"><button className="btn-primary btn-sm" disabled={busy}>{busy && <Loader2 size={14} className="spin" />} Update password</button></div>
      </form>

      <div className="card p-5 border-danger/40">
        <h3 className="font-bold text-danger">Danger zone</h3>
        <p className="text-sm text-muted mt-1">Deleting your account permanently removes your profile, posts, comments and songs.</p>
        <button className="btn-danger btn-sm mt-4" onClick={() => setDelOpen(true)}><Trash2 size={14} /> Delete my account</button>
      </div>

      <Modal open={delOpen} onClose={() => !deleting && setDelOpen(false)} title="Delete account" size="sm">
        <form onSubmit={deleteAccount} className="space-y-3">
          <p className="text-sm text-muted">This can’t be undone. Enter your password to confirm.</p>
          <input className="field" type="password" placeholder="Your password" value={delPw} onChange={(e) => setDelPw(e.target.value)} required autoFocus />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setDelOpen(false)} disabled={deleting}>Cancel</button>
            <button className="btn-danger btn-sm" disabled={deleting || !delPw}>{deleting && <Loader2 size={14} className="spin" />} Delete forever</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('profile');
  return (
    <>
      <PageHeader title="Settings" />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'profile', label: 'Profile', icon: UserIcon },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'account', label: 'Account', icon: Lock },
      ]} />
      <div className="p-4">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'appearance' && <AppearanceTab />}
        {tab === 'account' && <AccountTab />}
      </div>
    </>
  );
}
