import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck, Trash2, Check, Ban, TriangleAlert, UserCog, Search } from 'lucide-react';
import api, { errMsg, mediaUrl } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar, EmptyState, Menu, MenuItem, Modal, PageHeader, Spinner, Tabs, useConfirm } from '../components/ui.jsx';
import { REPORT_REASONS } from '../components/ReportDialog.jsx';
import { MoreHorizontal } from 'lucide-react';
import { timeAgo } from '../utils/format.js';

const reasonLabel = Object.fromEntries(REPORT_REASONS);
const DAYS = [['1', '1 day'], ['7', '7 days'], ['30', '30 days'], ['0', 'Permanent']];

/* ---- small modal: reason (+ duration) ---- */
function ActionModal({ config, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [days, setDays] = useState('7');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (config) { setText(''); setDays('7'); setBusy(false); } }, [config]);
  if (!config) return null;
  const go = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit({ text: text.trim(), days }); onClose(); } catch { setBusy(false); }
  };
  return (
    <Modal open onClose={busy ? undefined : onClose} title={config.title} size="sm">
      <form onSubmit={go} className="space-y-3">
        {config.hint && <p className="text-sm text-muted">{config.hint}</p>}
        <textarea className="field resize-none" rows={3} maxLength={250} required={config.required} placeholder={config.placeholder} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        {config.duration && (
          <div className="flex flex-wrap gap-2">
            {DAYS.map(([v, l]) => (
              <button type="button" key={v} onClick={() => setDays(v)} className={`chip transition ${days === v ? '!bg-accent !text-white !border-accent' : ''}`}>{l}</button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`${config.danger ? 'btn-danger' : 'btn-primary'} btn-sm`} disabled={busy}>{config.confirm}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---- overview ---- */
function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/admin/stats').then((r) => setS(r.data)).catch(() => setS({})); }, []);
  if (!s) return <div className="py-16 grid place-items-center"><Spinner /></div>;
  const cards = [
    ['Open reports', s.openReports, s.openReports > 0], ['Suspended users', s.banned], ['Total users', s.users], ['New users (7 days)', s.newUsers],
    ['Total posts', s.posts], ['New posts (7 days)', s.newPosts], ['Songs', s.songs], ['Chains', s.chains],
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(([label, n, hot]) => (
        <div key={label} className={`card p-4 ${hot ? '!border-danger/60' : ''}`}>
          <p className="text-2xl font-bold">{n ?? 0}</p>
          <p className="text-xs text-muted mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

/* ---- reports ---- */
function Reports() {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState('open');
  const [items, setItems] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(() => {
    setItems(null);
    api.get('/admin/reports', { params: { status } }).then((r) => setItems(r.data)).catch((e) => { setItems([]); toast.error(errMsg(e)); });
  }, [status, toast]);
  useEffect(() => { load(); }, [load]);

  const dismiss = async (it) => {
    try { await api.post(`/admin/reports/${it.post._id}/dismiss`); toast.success('Post kept, reports dismissed'); setItems((p) => p.filter((x) => x.post._id !== it.post._id)); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const remove = (it, suspend) => setModal({
    title: suspend ? 'Remove post and suspend author' : 'Remove post',
    hint: 'The author gets a notice with this reason.', placeholder: 'Reason (shown to the author)', required: true,
    duration: suspend, danger: true, confirm: suspend ? 'Remove and suspend' : 'Remove post',
    submit: async ({ text, days }) => {
      try {
        await api.post(`/admin/reports/${it.post._id}/remove`, { reason: text, suspend, days: Number(days) });
        toast.success('Post removed');
        setItems((p) => p.filter((x) => x.post._id !== it.post._id));
      } catch (e) { toast.error(errMsg(e)); throw e; }
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[['open', 'Open'], ['actioned', 'Removed'], ['dismissed', 'Dismissed']].map(([id, l]) => (
          <button key={id} onClick={() => setStatus(id)} className={`chip transition ${status === id ? '!bg-accent !text-white !border-accent' : ''}`}>{l}</button>
        ))}
      </div>
      {items === null ? <div className="py-12 grid place-items-center"><Spinner /></div>
        : items.length === 0 ? <EmptyState icon="sparkles" title={status === 'open' ? 'No open reports' : 'Nothing here'} text={status === 'open' ? 'When people report a post it will show up here.' : ''} />
        : items.map((it) => {
          const counts = {};
          it.reports.forEach((r) => { counts[r.reason] = (counts[r.reason] || 0) + 1; });
          const thumb = it.post.media[0];
          return (
            <div key={it.post._id} className="card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar user={it.post.author} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">@{it.post.author?.username} <span className="text-muted font-normal">· {timeAgo(it.post.createdAt)}</span> {it.hidden && <span className="chip ml-1">Hidden</span>}</p>
                  {it.post.text && <p className="text-sm mt-1 break-words whitespace-pre-wrap line-clamp-4">{it.post.text}</p>}
                </div>
                {thumb && (thumb.type === 'image'
                  ? <img src={mediaUrl(thumb.url)} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  : <video src={mediaUrl(thumb.url)} className="w-16 h-16 rounded-lg object-cover" muted />)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(counts).map(([r, n]) => <span key={r} className="chip !text-danger !border-danger/40">{reasonLabel[r] || r} × {n}</span>)}
              </div>
              <p className="text-xs text-muted">Reported by {it.reports.map((r) => `@${r.reporter?.username || 'deleted'}`).join(', ')}
                {it.reports.some((r) => r.details) && <> · “{it.reports.find((r) => r.details).details}”</>}</p>
              <div className="flex flex-wrap gap-2 justify-end">
                <Link to={`/post/${it.post._id}`} className="btn-ghost btn-sm">View</Link>
                {status === 'open' && (
                  <>
                    <button className="btn-ghost btn-sm" onClick={() => dismiss(it)}><Check size={14} /> Keep post</button>
                    <button className="btn-danger btn-sm" onClick={() => remove(it, false)}><Trash2 size={14} /> Remove</button>
                    <button className="btn-danger btn-sm" onClick={() => remove(it, true)}><Ban size={14} /> Remove and suspend</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      <ActionModal config={modal} onClose={() => setModal(null)} onSubmit={(v) => modal.submit(v)} />
    </div>
  );
}

/* ---- users ---- */
function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(() => {
    api.get('/admin/users', { params: { q, filter } }).then((r) => setItems(r.data)).catch((e) => { setItems([]); toast.error(errMsg(e)); });
  }, [q, filter, toast]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const run = async (fn, okMsg) => { try { await fn(); toast.success(okMsg); load(); } catch (e) { toast.error(errMsg(e)); throw e; } };
  const warn = (u) => setModal({ title: `Warn @${u.username}`, placeholder: 'What should they know or stop doing?', required: true, confirm: 'Send warning',
    submit: ({ text }) => run(() => api.post(`/admin/users/${u._id}/warn`, { message: text }), 'Warning sent') });
  const suspend = (u) => setModal({ title: `Suspend @${u.username}`, hint: 'They are signed out, cannot log in, and their posts are hidden until the suspension ends.', placeholder: 'Reason (shown when they try to log in)', required: true, duration: true, danger: true, confirm: 'Suspend',
    submit: ({ text, days }) => run(() => api.post(`/admin/users/${u._id}/ban`, { reason: text, days: Number(days) }), 'Account suspended') });
  const unsuspend = (u) => run(() => api.post(`/admin/users/${u._id}/unban`), 'Suspension lifted');
  const toggleAdmin = async (u) => {
    const makeAdmin = u.role !== 'admin';
    if (!(await confirm({ title: makeAdmin ? 'Make admin?' : 'Remove admin rights?', message: `@${u.username} ${makeAdmin ? 'will be able to review reports and suspend users.' : 'will become a normal user.'}`, confirmText: 'Confirm' }))) return;
    run(() => api.post(`/admin/users/${u._id}/role`, { role: makeAdmin ? 'admin' : 'user' }), 'Role updated').catch(() => {});
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field !pl-10" placeholder="Search name, username or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex gap-2">
        {[['', 'All'], ['banned', 'Suspended'], ['admin', 'Admins']].map(([id, l]) => (
          <button key={id} onClick={() => setFilter(id)} className={`chip transition ${filter === id ? '!bg-accent !text-white !border-accent' : ''}`}>{l}</button>
        ))}
      </div>
      {items === null ? <div className="py-12 grid place-items-center"><Spinner /></div>
        : items.length === 0 ? <EmptyState icon="user" title="No users found" />
        : (
          <div className="card divide-y divide-line">
            {items.map((u) => (
              <div key={u._id} className="flex items-center gap-3 p-3">
                <Avatar user={u} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    <Link to={`/u/${u.username}`} className="hover:underline">@{u.username}</Link>
                    {u.role === 'admin' && <span className="chip ml-2 !py-0">Admin</span>}
                    {u.banned && <span className="chip ml-2 !py-0 !text-danger !border-danger/40">Suspended</span>}
                  </p>
                  <p className="text-xs text-muted truncate">{u.email} · {u.postsCount} posts{u.warnings ? ` · ${u.warnings} warning${u.warnings > 1 ? 's' : ''}` : ''}</p>
                  {u.banned && <p className="text-xs text-danger truncate">{u.bannedUntil ? `Until ${new Date(u.bannedUntil).toLocaleDateString()}` : 'Permanent'}{u.banReason ? ` · ${u.banReason}` : ''}</p>}
                </div>
                {u._id !== me._id && (
                  <Menu trigger={<button className="icon-btn" aria-label={`Actions for ${u.username}`}><MoreHorizontal size={18} /></button>} width="w-52">
                    <MenuItem icon={TriangleAlert} onClick={() => warn(u)}>Send warning</MenuItem>
                    {u.banned ? <MenuItem icon={Check} onClick={() => unsuspend(u)}>Lift suspension</MenuItem>
                      : u.role !== 'admin' && <MenuItem icon={Ban} danger onClick={() => suspend(u)}>Suspend account</MenuItem>}
                    <MenuItem icon={UserCog} onClick={() => toggleAdmin(u)}>{u.role === 'admin' ? 'Remove admin' : 'Make admin'}</MenuItem>
                  </Menu>
                )}
              </div>
            ))}
          </div>
        )}
      <ActionModal config={modal} onClose={() => setModal(null)} onSubmit={(v) => modal.submit(v)} />
    </div>
  );
}

/* ---- activity log ---- */
const ACTION_TEXT = {
  remove_post: 'removed a post by', warn_user: 'warned', suspend_user: 'suspended', unsuspend_user: 'lifted the suspension of',
  dismiss_reports: 'dismissed reports on a post by', make_admin: 'made admin', remove_admin: 'removed admin rights from',
  remove_song: 'removed a song by', remove_chain: 'removed a chain by',
};
function Log() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get('/admin/log').then((r) => setItems(r.data)).catch(() => setItems([])); }, []);
  if (!items) return <div className="py-12 grid place-items-center"><Spinner /></div>;
  if (!items.length) return <EmptyState icon="file" title="No activity yet" text="Every admin action is recorded here." />;
  return (
    <ul className="card divide-y divide-line">
      {items.map((a) => (
        <li key={a._id} className="p-3 text-sm">
          <b>@{a.admin}</b> {ACTION_TEXT[a.action] || a.action}{a.target && <> <b>@{a.target}</b></>}
          {a.note && <p className="text-xs text-muted mt-0.5 break-words">{a.note}</p>}
          <p className="text-xs text-muted mt-0.5">{timeAgo(a.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return (
    <>
      <PageHeader title="Admin" subtitle="Moderation" right={<ShieldCheck size={20} className="text-accent" />} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'reports', label: 'Reports' }, { id: 'users', label: 'Users' }, { id: 'log', label: 'Log' }]} />
      <div className="p-4">
        {tab === 'overview' && <Overview />}
        {tab === 'reports' && <Reports />}
        {tab === 'users' && <Users />}
        {tab === 'log' && <Log />}
      </div>
    </>
  );
}
