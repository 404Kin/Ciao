import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errMsg } from '../utils/api.js';
import { LogoMark } from '../components/Brand.jsx';
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
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-70 gradient-accent scale-110" />
            <LogoMark size={80} className="relative drop-shadow-2xl" />
          </div>
          <span className="font-script text-6xl font-bold mt-3 leading-none drop-shadow-lg">Ciao</span>
          
        </div>

        <div className="rounded-[28px] border border-white/20 bg-black/40 backdrop-blur-2xl shadow-2xl p-6 sm:p-7">
          <h1 className="text-2xl font-extrabold">{title}</h1>
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
    <Shell title="Welcome back" subtitle="Log in to continue." footer={<>New here? <Link to="/register" className={linkCls}>Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-3">
        <input className={INPUT} placeholder="Email or username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy && <Loader2 size={16} className="spin" />} Log in</button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', username: '', email: '', password: '', confirm: '', avatar: AVATAR_PRESETS[0] ? presetValue(AVATAR_PRESETS[0].id) : '' });
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (f.password !== f.confirm) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await register({ name: f.name, username: f.username, email: f.email, password: f.password, avatar: f.avatar });
      toast.success('Welcome to Ciao! Add a profile photo in Settings.');
      navigate('/');
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  return (
    <Shell  footer={<>Already have an account? <Link to="/login" className={linkCls}>Log in</Link></>}>
      <form onSubmit={submit} className="space-y-3">
        {AVATAR_PRESETS.length > 0 && (
          <div>
            <p className="text-xs text-white/60 text-center mb-2">Pick an avatar (you can upload your own photo later)</p>
            <div className="flex flex-wrap gap-2 justify-center max-h-[88px] overflow-y-auto py-1">
              {AVATAR_PRESETS.map((a) => (
                <button type="button" key={a.id} onClick={() => setF((p) => ({ ...p, avatar: presetValue(a.id) }))}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 transition shrink-0 ${f.avatar === presetValue(a.id) ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100 hover:border-white/40'}`} aria-label={`Avatar ${a.id}`}>
                  <img src={a.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
        <input className={INPUT} placeholder="Full name" value={f.name} onChange={set('name')} maxLength={40} required />
        <input className={INPUT} placeholder="Username (letters, numbers, _)" value={f.username} onChange={(e) => setF((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} maxLength={20} required />
        <input className={INPUT} type="email" placeholder="Email" value={f.email} onChange={set('email')} autoComplete="email" required />
        <PasswordField value={f.password} onChange={set('password')} placeholder="Password (min 6)" autoComplete="new-password" />
        <PasswordField value={f.confirm} onChange={set('confirm')} placeholder="Confirm password" autoComplete="new-password" />
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy && <Loader2 size={16} className="spin" />} Create account</button>
      </form>
    </Shell>
  );
}
