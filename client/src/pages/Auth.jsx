import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api, { errMsg } from '../utils/api.js';
import { LogoMark } from '../components/Brand.jsx';
import ImageCropper from '../components/ImageCropper.jsx';
import { AVATAR_PRESETS, presetValue } from '../utils/avatars.js';
import { AuthBackdrop, BackgroundPicker, useAuthBackground } from '../components/AuthBackground.jsx';

const INPUT = 'field !bg-white/10 !border-white/20 !text-white placeholder:!text-white/50 focus:!border-white/70 focus:!ring-white/20';

function Shell({ title, subtitle, children, footer }) {
  const bg = useAuthBackground();
  return (
    // forced dark tokens so text stays readable on top of any background
    <div data-theme="dark" className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 text-white">
      <AuthBackdrop bg={bg.active} />

      <div className="w-full max-w-[420px] animate-rise">
        <div className="flex flex-col items-center text-center mb-6">
          <LogoMark size={64} />
          <span className="font-script text-5xl font-bold mt-3 leading-none">Ciao</span>
          
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/45 backdrop-blur-xl p-6 sm:p-7">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-white/65 text-sm mt-1 mb-5">{subtitle}</p>
          {children}
        </div>
        <p className="text-sm text-white/75 text-center mt-5 drop-shadow">{footer}</p>
      </div>

      <BackgroundPicker state={bg} />
    </div>
  );
}

function PasswordField({ value, onChange, placeholder = 'Password', autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input className={`${INPUT} !pr-11`} type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={onChange} autoComplete={autoComplete} required />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

const linkCls = 'text-white font-bold underline underline-offset-4 decoration-white/40 hover:decoration-white';

export function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const note = sessionStorage.getItem('ciao_notice');
    if (note) { toast.error(note); sessionStorage.removeItem('ciao_notice'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  return (
    <Shell title="Log in" subtitle="Welcome back. Enter your details to continue." footer={<>New here? <Link to="/register" className={linkCls}>Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-3">
        <input className={INPUT} placeholder="Email or username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <button className="btn-primary w-full !py-2.5" disabled={busy}>{busy && <Loader2 size={16} className="spin" />} Log in</button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { user, register, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', username: '', email: '', password: '', confirm: '', avatar: AVATAR_PRESETS[0] ? presetValue(AVATAR_PRESETS[0].id) : '' });
  const [busy, setBusy] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const fileInput = useRef(null);
  useEffect(() => {
    if (!photo) { setPhotoUrl(''); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  if (user) return <Navigate to="/" replace />;
  const chosenPreset = AVATAR_PRESETS.find((a) => presetValue(a.id) === f.avatar);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (f.password !== f.confirm) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await register({ name: f.name, username: f.username, email: f.email, password: f.password, avatar: photo ? '' : f.avatar });
      if (photo) {
        try {
          const fd = new FormData();
          fd.append('avatar', photo);
          await api.post('/users/me/avatar', fd);
          await refresh();
        } catch { toast.info('Account created, but the photo could not be uploaded. You can add it in Settings.'); }
      }
      toast.success('Welcome to Ciao');
      navigate('/');
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  return (
    <Shell title="Create your account" subtitle="Add a profile picture, then you are in." footer={<>Already have an account? <Link to="/login" className={linkCls}>Log in</Link></>}>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col items-center">
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file && !file.type.startsWith('image/')) toast.error('Please choose an image'); else if (file) setCropFile(file); e.target.value = ''; }} />
          <button type="button" onClick={() => fileInput.current?.click()} aria-label="Upload your own photo"
            className="relative w-24 h-24 rounded-full overflow-hidden border border-white/40 bg-white/10 grid place-items-center group">
            {photoUrl ? <img src={photoUrl} alt="Your photo" className="w-full h-full object-cover" />
              : chosenPreset ? <img src={chosenPreset.url} alt="" className="w-full h-full object-cover" />
              : <Camera className="text-white/70" />}
            <span className="absolute inset-x-0 bottom-0 bg-black/55 text-[10px] font-semibold py-1 opacity-0 group-hover:opacity-100 transition">Change</span>
          </button>
          <div className="flex gap-4 mt-2 text-sm font-semibold">
            <button type="button" className="text-white hover:underline" onClick={() => fileInput.current?.click()}>{photo ? 'Change photo' : 'Upload your photo'}</button>
            {photo && <button type="button" className="text-white/70 hover:underline" onClick={() => setPhoto(null)}>Remove</button>}
          </div>
          {AVATAR_PRESETS.length > 0 && (
            <>
              <p className="text-xs text-white/60 mt-3 mb-2">or pick an avatar</p>
              <div className="flex flex-wrap gap-2 justify-center max-h-[88px] overflow-y-auto py-1">
                {AVATAR_PRESETS.map((a) => (
                  <button type="button" key={a.id} onClick={() => { setPhoto(null); setF((p) => ({ ...p, avatar: presetValue(a.id) })); }}
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition shrink-0 ${!photo && f.avatar === presetValue(a.id) ? 'border-white' : 'border-transparent opacity-75 hover:opacity-100'}`} aria-label={`Avatar ${a.id}`}>
                    <img src={a.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <input className={INPUT} placeholder="Full name" value={f.name} onChange={set('name')} maxLength={40} required />
        <input className={INPUT} placeholder="Username (letters, numbers, _)" value={f.username} onChange={(e) => setF((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} maxLength={20} required />
        <input className={INPUT} type="email" placeholder="Email" value={f.email} onChange={set('email')} autoComplete="email" required />
        <PasswordField value={f.password} onChange={set('password')} placeholder="Password (min 6)" autoComplete="new-password" />
        <PasswordField value={f.confirm} onChange={set('confirm')} placeholder="Confirm password" autoComplete="new-password" />
        <button className="btn-primary w-full !py-2.5" disabled={busy}>{busy && <Loader2 size={16} className="spin" />} Create account</button>
        <p className="text-[11px] text-white/55 text-center">By signing up you agree to our <Link to="/guidelines" className="underline">community guidelines</Link>.</p>
      </form>
      <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(file) => { setCropFile(null); setPhoto(file); }} />
    </Shell>
  );
}
