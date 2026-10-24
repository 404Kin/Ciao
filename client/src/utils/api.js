import axios from 'axios';

const API = (import.meta.env.VITE_API || 'http://localhost:5000/api').replace(/\/$/, '');
export const API_ORIGIN = API.replace(/\/api$/, '');

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ciao_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    // An expired / invalid session: clear it and bounce to login (but not for the login call itself)
    if (error.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/register')) {
      localStorage.removeItem('ciao_token');
      window.dispatchEvent(new Event('ciao:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const errMsg = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.error ||
  (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is it running on port 5000?' : err?.message) ||
  fallback;

// turn "/uploads/x.jpg" into a full url
export const mediaUrl = (u) => (!u ? '' : /^(https?:|blob:|data:)/.test(u) ? u : `${API_ORIGIN}${u}`);

export default api;
