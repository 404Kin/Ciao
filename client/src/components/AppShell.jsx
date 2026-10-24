import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Music, Bell, Bookmark, User, Settings, Plus, Search, LogOut, Link2 } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Modal } from './ui.jsx';
import Composer from './Composer.jsx';
import RightPanel from './RightPanel.jsx';
import { MiniPlayer } from './music.jsx';
import { Logo } from './Brand.jsx';
import { useMusic } from '../context/MusicContext.jsx';

const NotifContext = createContext({ unread: 0, refresh: () => {}, clear: () => {} });
export const useNotifs = () => useContext(NotifContext);

export { Logo };

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { current } = useMusic();
  const [composeOpen, setComposeOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [turns, setTurns] = useState(0);

  const refresh = useCallback(() => {
    api.get('/notifications/unread-count').then((r) => setUnread(r.data.count)).catch(() => {});
    api.get('/chains/turn-count').then((r) => setTurns(r.data.count)).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const nav = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/music', label: 'Music', icon: Music },
    { to: '/chains', label: 'Chains', icon: Link2, badge: turns },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unread },
    { to: '/saved', label: 'Saved', icon: Bookmark },
    { to: `/u/${user.username}`, label: 'Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const onPosted = (post) => {
    setComposeOpen(false);
    window.dispatchEvent(new CustomEvent('ciao:new-post', { detail: post }));
    if (location.pathname !== '/') navigate('/');
  };

  const linkCls = ({ isActive }) =>
    `relative flex items-center gap-4 rounded-full px-4 py-3 text-[16px] transition hover:bg-surface2 ${
      isActive ? 'font-extrabold text-ink' : 'font-medium text-ink/80'
    } max-lg:justify-center max-lg:px-0 max-lg:w-12 max-lg:h-12 max-lg:mx-auto`;

  return (
    <NotifContext.Provider value={{ unread, refresh, clear: () => setUnread(0) }}>
      <div className="mx-auto flex justify-center max-w-[1280px]">
        {/* LEFT NAV (tablet + desktop) */}
        <header className="hidden md:flex sticky top-0 h-screen w-[84px] lg:w-[270px] shrink-0 flex-col px-2 lg:px-4 py-4 pb-28">
          <Link to="/" className="px-2 py-1 mb-4 max-lg:flex max-lg:justify-center"><Logo size={42} textClassName="max-lg:hidden" /></Link>
          <nav className="flex flex-col gap-1">
            {nav.map(({ to, label, icon: Icon, end, badge }) => (
              <NavLink key={to} to={to} end={end} className={linkCls} title={label}>
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon size={24} strokeWidth={isActive ? 2.6 : 2} />
                      {badge > 0 && <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold grid place-items-center">{badge > 99 ? '99+' : badge}</span>}
                    </span>
                    <span className="max-lg:hidden">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <button className="btn-primary mt-5 !py-3.5 text-base max-lg:!w-12 max-lg:!h-12 max-lg:!p-0 max-lg:mx-auto" onClick={() => setComposeOpen(true)} aria-label="New post">
            <Plus size={22} className="lg:hidden" /> <span className="max-lg:hidden">New post</span>
          </button>

          <div className="mt-auto flex items-center gap-3 rounded-full p-2 hover:bg-surface2 transition max-lg:justify-center">
            <Link to={`/u/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1 max-lg:flex-none">
              <Avatar user={user} size={40} />
              <span className="min-w-0 max-lg:hidden">
                <span className="block font-bold text-sm truncate">{user.name}</span>
                <span className="block text-xs text-muted truncate">@{user.username}</span>
              </span>
            </Link>
            <button className="icon-btn max-lg:hidden" onClick={() => { logout(); navigate('/login'); }} aria-label="Log out" title="Log out"><LogOut size={18} /></button>
          </div>
        </header>

        {/* CENTER */}
        <main className="w-full min-w-0 max-w-[640px] md:border-x border-line min-h-screen pb-40 md:pb-32">
          {/* mobile top bar */}
          <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-bg/85 backdrop-blur-xl border-b border-line">
            <Link to="/"><Logo size={34} /></Link>
            <div className="flex items-center">
              <Link to="/explore" className="icon-btn" aria-label="Search"><Search size={21} /></Link>
              <Link to="/chains" className="icon-btn relative" aria-label="Chains">
                <Link2 size={21} />
                {turns > 0 && <span className="absolute top-0.5 right-0 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-bold grid place-items-center">{turns > 9 ? '9+' : turns}</span>}
              </Link>
              <Link to="/notifications" className="icon-btn relative" aria-label="Notifications">
                <Bell size={21} />
                {unread > 0 && <span className="absolute top-0.5 right-0 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold grid place-items-center">{unread > 9 ? '9+' : unread}</span>}
              </Link>
              <Link to="/settings" className="icon-btn" aria-label="Settings"><Settings size={20} /></Link>
            </div>
          </div>
          <Outlet />
        </main>

        {/* RIGHT PANEL (wide desktop) */}
        <aside className="hidden xl:block w-[340px] shrink-0 px-5 py-4">
          <RightPanel />
        </aside>
      </div>

      <MiniPlayer />

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg/90 backdrop-blur-xl border-t border-line safe-bottom">
        <div className="grid grid-cols-5 h-[60px] items-center">
          {[
            { to: '/', icon: Home, label: 'Home', end: true },
            { to: '/explore', icon: Compass, label: 'Explore' },
            null,
            { to: '/music', icon: Music, label: 'Music' },
            { to: `/u/${user.username}`, icon: User, label: 'Profile' },
          ].map((it, i) =>
            it === null ? (
              <button key="add" onClick={() => setComposeOpen(true)} className="mx-auto w-12 h-12 -mt-4 rounded-2xl gradient-accent text-white grid place-items-center shadow-glow active:scale-95 transition" aria-label="New post">
                <Plus size={26} />
              </button>
            ) : (
              <NavLink key={it.to} to={it.to} end={it.end} aria-label={it.label}
                className={({ isActive }) => `flex flex-col items-center gap-0.5 text-[10px] font-semibold ${isActive ? 'text-accent' : 'text-muted'}`}>
                <it.icon size={22} />{it.label}
              </NavLink>
            )
          )}
        </div>
      </nav>

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="Create post" size="md">
        <Composer compact autoFocus onPosted={onPosted} />
      </Modal>
      {current && <div className="h-0" />}
    </NotifContext.Provider>
  );
}
