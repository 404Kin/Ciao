import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Trash2, Sun, Moon, Monitor, Check, LogOut, Lock, User as UserIcon, Palette, Volume2, Loader2, Save, ImagePlus, Image as ImageIcon } from 'lucide-react';
import api, { errMsg, mediaUrl } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ACCENTS, THEME_TEMPLATES, useTheme } from '../context/ThemeContext.jsx';
import { toDataUrl } from '../components/AuthBackground.jsx';
import { useMusic } from '../context/MusicContext.jsx';
import { Avatar, PageHeader, Tabs, Modal, useConfirm } from '../components/ui.jsx';
import { gradientFor } from '../utils/format.js';
import { AVATAR_PRESETS, presetValue } from '../utils/avatars.js';
import ImageCropper from '../components/ImageCropper.jsx';

function ProfileTab() {
  const { user, patchUser, refresh } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [cropFile, setCropFile] = useState(null);
  const [form, setForm] = useState({
    name: user.name || '', username: user.username || '', bio: user.bio || '', status: user.status || '',
    location: user.location || '', website: user.website || '',
  });
  const [saving, setSaving] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyCover, setBusyCover] = useState(false);
  const avatarInput = useRef(null);
  const coverInput = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const upload = async (kind, file, setBusy) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    const limit = kind === 'avatar' ? 8 : 12;
    if (file.size > limit * 1024 * 1024) return toast.error(`Image is too large (max ${limit} MB)`);
    const fd = new FormData();
    fd.append(kind, file);
    setBusy(true);
    try {
      const { data } = await api.post(`/users/me/${kind}`, fd);
      patchUser(kind === 'avatar' ? { avatarUrl: data.avatarUrl } : { cover: data.cover });
      toast.success(kind === 'avatar' ? 'Profile photo updated 📸' : 'Cover photo updated');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const removeImage = async (kind, setBusy) => {
    setBusy(true);
    try {
      await api.delete(`/users/me/${kind}`);
      patchUser(kind === 'avatar' ? { avatarUrl: '' } : { cover: '' });
      toast.success('Removed');
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
      toast.success('Profile saved ✅');
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      {/* cover + avatar */}
      <div className="card overflow-hidden">
        <div className="h-32 sm:h-40 relative" style={user.cover ? undefined : { background: gradientFor(user.username) }}>
          {user.cover && <img src={mediaUrl(user.cover)} alt="" className="w-full h-full object-cover" />}
          <div className="absolute right-3 bottom-3 flex gap-2">
            <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => { upload('cover', e.target.files?.[0], setBusyCover); e.target.value = ''; }} />
            <button type="button" className="btn !bg-black/60 !text-white btn-sm backdrop-blur" onClick={() => coverInput.current?.click()} disabled={busyCover}>
              {busyCover ? <Loader2 size={13} className="spin" /> : <Camera size={13} />} {user.cover ? 'Change cover' : 'Add cover'}
            </button>
            {user.cover && <button type="button" className="btn !bg-black/60 !text-white btn-sm backdrop-blur" onClick={() => removeImage('cover', setBusyCover)} disabled={busyCover} aria-label="Remove cover"><Trash2 size={13} /></button>}
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="relative z-10 flex items-end gap-4 -mt-10">
            <div className="relative">
              <div className="rounded-full border-4 border-surface"><Avatar user={user} size={92} /></div>
              <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && !f.type.startsWith('image/')) toast.error('Please choose an image file'); else if (f) setCropFile(f); e.target.value = ''; }} />
              <button type="button" onClick={() => avatarInput.current?.click()} disabled={busyAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full gradient-accent text-white grid place-items-center border-2 border-surface" aria-label="Upload profile photo">
                {busyAvatar ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
              </button>
            </div>
            <div className="pb-1 flex gap-2 flex-wrap">
              <button type="button" className="btn-primary btn-sm" onClick={() => avatarInput.current?.click()} disabled={busyAvatar}>Upload photo</button>
              {user.avatarUrl && <button type="button" className="btn-ghost btn-sm" onClick={() => removeImage('avatar', setBusyAvatar)} disabled={busyAvatar}><Trash2 size={13} /> Remove</button>}
            </div>
          </div>
          {AVATAR_PRESETS.length > 0 && (
            <>
              <p className="text-xs text-muted mt-4 mb-2">No photo? Pick an avatar:</p>
              <div className="flex flex-wrap gap-2.5">
                {AVATAR_PRESETS.map((a) => {
                  const active = !user.avatarUrl && user.avatar === presetValue(a.id);
                  return (
                    <button type="button" key={a.id} onClick={() => pickPreset(a.id)} aria-pressed={active} aria-label={`Avatar ${a.id}`}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition hover:scale-105 ${active ? 'border-accent ring-2 ring-accent/40' : 'border-transparent hover:border-line'}`}>
                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-bold">Profile details</h3>
        <label className="block"><span className="text-xs font-semibold text-muted">Name</span>
          <input className="field mt-1" value={form.name} onChange={set('name')} maxLength={40} required /></label>
        <label className="block"><span className="text-xs font-semibold text-muted">Username</span>
          <div className="relative mt-1"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">@</span>
            <input className="field !pl-9" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} maxLength={20} required /></div></label>
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
          <button className="btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save changes</button>
        </div>
      </div>
      <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(f) => { setCropFile(null); upload('avatar', f, setBusyAvatar); }} />
    </form>
  );
}

function AppearanceTab() {
  const { theme, setTheme, accent, setAccent, bgId, dim, setDim, templateId, applyTemplate, setCustomBackground, removeBackground } = useTheme();
  const { volume, setVolume } = useMusic();
  const toast = useToast();
  const bgInput = useRef(null);
  const modes = [['dark', 'Dark', Moon], ['light', 'Light', Sun], ['system', 'System', Monitor]];
  const hasBg = bgId !== 'none';

  const thumb = (t) => {
    if (t.bg?.image) return { backgroundImage: `url(${t.bg.image})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (t.bg?.css) return { background: t.bg.css };
    return { background: t.swatch };
  };
  const pickTemplate = (t) => { applyTemplate(t); toast.success(`${t.name} theme applied`); };

  const onBgFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Please choose an image');
    try {
      const url = await toDataUrl(f, 1920);
      if (!setCustomBackground(url)) toast.error('That picture is too big to save in this browser');
      else toast.success('Background changed ✨');
    } catch { toast.error('Could not read that image'); }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-bold">Theme templates</h3>
        <p className="text-xs text-muted mb-3">One tap changes the colours, light/dark mode and the picture behind the whole app.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEME_TEMPLATES.map((t) => {
            const active = templateId === t.id;
            const dot = ACCENTS.find((a) => a.id === t.accent)?.color;
            return (
              <button key={t.id} onClick={() => pickTemplate(t)} aria-pressed={active} aria-label={`${t.name} theme`}
                className={`relative text-left rounded-2xl overflow-hidden border-2 transition hover:scale-[1.02] ${active ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-accent/50'}`}>
                <div className="h-20 relative" style={thumb(t)}>
                  {t.mode === 'light' && !t.bg && <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-black/40">Aa</span>}
                  {t.mode === 'dark' && !t.bg && <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white/50">Aa</span>}
                  {active && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-white grid place-items-center"><Check size={12} /></span>}
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 bg-surface">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: dot }} />
                  <span className="text-xs font-semibold truncate">{t.name}</span>
                  <span className="ml-auto text-[10px] text-muted">{t.mode === 'dark' ? '🌙' : '☀️'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><ImageIcon size={16} /> Background picture</h3>
        <input ref={bgInput} type="file" accept="image/*" hidden onChange={(e) => { onBgFile(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary btn-sm" onClick={() => bgInput.current?.click()}><ImagePlus size={14} /> Use my own picture</button>
          {hasBg && <button className="btn-ghost btn-sm" onClick={removeBackground}><Trash2 size={14} /> Remove background</button>}
        </div>
        {hasBg ? (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted mb-1.5"><span>Picture visibility</span><span>{Math.round((1 - dim) * 100)}%</span></div>
            <input type="range" className="seek seek-visible w-full" min={0.1} max={1} step="0.01" value={1 - dim}
              style={{ '--p': `${(((1 - dim) - 0.1) / 0.9) * 100}%` }} onChange={(e) => setDim(1 - parseFloat(e.target.value))} aria-label="Picture visibility" />
            <p className="text-[11px] text-muted mt-1.5">Slide right for a stronger picture, or left if the text is hard to read.</p>
          </div>
        ) : <p className="text-xs text-muted mt-3">No picture right now — pick a template above or upload your own.</p>}
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3">Light / dark</h3>
        <div className="grid grid-cols-3 gap-3">
          {modes.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTheme(id)} aria-pressed={theme === id}
              className={`rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition ${theme === id ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/50'}`}>
              <Icon size={22} /><span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Palette size={16} /> Accent colour</h3>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button key={a.id} onClick={() => setAccent(a.id)} title={a.label} aria-label={a.label} aria-pressed={accent === a.id}
              className="w-11 h-11 rounded-full grid place-items-center text-white transition hover:scale-110" style={{ background: a.color }}>
              {accent === a.id && <Check size={20} />}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Volume2 size={16} /> Music volume</h3>
        <input type="range" className="seek w-full" min={0} max={1} step="0.01" value={volume} style={{ '--p': `${volume * 100}%` }} onChange={(e) => setVolume(parseFloat(e.target.value))} aria-label="Default volume" />
        <p className="text-xs text-muted mt-2">{Math.round(volume * 100)}% — remembered on this device.</p>
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
      toast.success('Password updated 🔒');
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
