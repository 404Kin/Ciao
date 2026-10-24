import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider, AppBackdrop } from './context/ThemeContext.jsx';
import { MusicProvider } from './context/MusicContext.jsx';
import { ConfirmProvider, Spinner } from './components/ui.jsx';
import AppShell from './components/AppShell.jsx';
import { Logo } from './components/Brand.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Explore, { TagPage } from './pages/Explore.jsx';
import MusicPage from './pages/MusicPage.jsx';
import Notifications from './pages/Notifications.jsx';
import Saved from './pages/Saved.jsx';
import PostPage from './pages/PostPage.jsx';
import Profile, { MyProfileRedirect } from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Chains from './pages/Chains.jsx';
import ChainPage from './pages/ChainPage.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center"><Logo size={64} /><div className="mt-4 grid place-items-center"><Spinner size={26} /></div></div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function NotFound() {
  return (
    <div className="p-10 text-center">
      <div className="text-6xl mb-3">🧭</div>
      <h2 className="font-bold text-xl">Page not found</h2>
      <a href="/" className="btn-primary btn-sm mt-5 inline-flex">Go home</a>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppBackdrop />
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <ConfirmProvider>
              <MusicProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route element={<Protected><AppShell /></Protected>}>
                    <Route path="/" element={<Home />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/tag/:tag" element={<TagPage />} />
                    <Route path="/music" element={<MusicPage />} />
                    <Route path="/chains" element={<Chains />} />
                    <Route path="/chain/:id" element={<ChainPage />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/saved" element={<Saved />} />
                    <Route path="/post/:id" element={<PostPage />} />
                    <Route path="/u/:username" element={<Profile />} />
                    <Route path="/profile" element={<MyProfileRedirect />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </MusicProvider>
            </ConfirmProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
