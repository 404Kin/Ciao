import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // restore session
  useEffect(() => {
    const token = localStorage.getItem('ciao_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/users/me')
      .then((res) => setUser(res.data))
      .catch((err) => {
        if (err.response?.status === 401) localStorage.removeItem('ciao_token');
      })
      .finally(() => setLoading(false));
  }, []);

  // any 401 from the API logs us out
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('ciao:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ciao:unauthorized', onUnauthorized);
  }, []);

  const finishAuth = async (data) => {
    localStorage.setItem('ciao_token', data.token);
    const { data: me } = await api.get('/users/me');
    setUser(me);
    return me;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return finishAuth(data);
  };

  const login = async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    return finishAuth(data);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('ciao_token');
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/users/me');
    setUser(data);
    return data;
  }, []);

  const patchUser = useCallback((patch) => setUser((u) => (u ? { ...u, ...patch } : u)), []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, refresh, patchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
