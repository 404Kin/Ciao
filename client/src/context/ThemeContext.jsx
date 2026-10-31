import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const ACCENTS = [
  { id: 'blue', color: '#0095f6', label: 'Blue' },
  { id: 'violet', color: '#7c3aed', label: 'Violet' },
  { id: 'pink', color: '#e83e8c', label: 'Pink' },
  { id: 'cyan', color: '#0891b2', label: 'Teal' },
  { id: 'green', color: '#16a34a', label: 'Green' },
  { id: 'orange', color: '#ea580c', label: 'Orange' },
];

const read = (k, d) => {
  try { return localStorage.getItem(k) || d; } catch { return d; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, v); } catch { /* storage unavailable */ }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(read('ciao_theme', 'light'));
  const [accent, setAccentState] = useState(read('ciao_accent', 'blue'));

  useEffect(() => {
    const apply = () => {
      const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
      document.documentElement.setAttribute('data-theme', resolved);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#000000' : '#ffffff');
    };
    apply();
    if (theme === 'system') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

  const setTheme = (t) => { setThemeState(t); write('ciao_theme', t); };
  const setAccent = (a) => { setAccentState(a); write('ciao_accent', a); };

  return <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
