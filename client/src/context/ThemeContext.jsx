import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const ACCENTS = [
  { id: 'violet', color: '#8b5cf6', label: 'Violet' },
  { id: 'pink', color: '#ec4899', label: 'Pink' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
  { id: 'green', color: '#10b981', label: 'Green' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
];

// Theme templates: one click changes the colours, the mode AND the picture behind the whole app.
// bg.image = file in /public  |  bg.css = generated background
export const THEME_TEMPLATES = [
  { id: 'dark', name: 'Classic Dark', mode: 'dark', accent: 'violet', swatch: '#0e0e14' },
  { id: 'light', name: 'Classic Light', mode: 'light', accent: 'violet', swatch: '#f4f4fa' },
  { id: 'town', name: 'Cozy Town', mode: 'light', accent: 'orange', dim: 0.62, bg: { image: '/pic.webp' } },
  { id: 'dreamer', name: 'Dreamer', mode: 'dark', accent: 'blue', dim: 0.6, bg: { image: '/pic3.jpg' } },
  { id: 'collage', name: 'Collage', mode: 'dark', accent: 'pink', dim: 0.66, bg: { image: '/pic5.jpg' } },
  { id: 'cube', name: 'Cube', mode: 'dark', accent: 'cyan', dim: 0.4, bg: { image: '/pic2.jpg' } },
  {
    id: 'aurora', name: 'Aurora', mode: 'dark', accent: 'green', dim: 0.15,
    bg: { css: 'radial-gradient(60% 50% at 20% 20%, #7c3aed 0%, transparent 60%), radial-gradient(50% 60% at 80% 30%, #06b6d4 0%, transparent 60%), radial-gradient(60% 60% at 50% 90%, #22c55e66 0%, transparent 60%), #0b0b1a' },
  },
  { id: 'sunset', name: 'Sunset', mode: 'dark', accent: 'pink', dim: 0.3, bg: { css: 'linear-gradient(160deg, #1e1b4b 0%, #7c3aed 30%, #ec4899 62%, #fb923c 88%, #fde68a 100%)' } },
  { id: 'ocean', name: 'Ocean', mode: 'dark', accent: 'cyan', dim: 0.2, bg: { css: 'radial-gradient(70% 50% at 70% 10%, #38bdf8aa 0%, transparent 60%), linear-gradient(180deg, #0c4a6e 0%, #0e7490 50%, #042f2e 100%)' } },
  { id: 'blush', name: 'Blush', mode: 'light', accent: 'pink', dim: 0.25, bg: { css: 'linear-gradient(135deg, #fce7f3 0%, #ede9fe 50%, #dbeafe 100%)' } },
];

const read = (k, d) => {
  try { return localStorage.getItem(k) ?? d; } catch { return d; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, v); } catch { /* storage full / unavailable */ }
};

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(read('ciao_theme', 'dark'));
  const [accent, setAccentState] = useState(read('ciao_accent', 'violet'));
  const [bgId, setBgIdState] = useState(read('ciao_bg', 'none')); // none | template id | custom
  const [dim, setDimState] = useState(parseFloat(read('ciao_bg_dim', '0.5')));
  const [custom, setCustom] = useState(read('ciao_bg_custom', ''));
  const [templateId, setTemplateId] = useState(read('ciao_theme_template', 'dark'));

  // light / dark / system
  useEffect(() => {
    const apply = () => {
      const resolved = mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
      document.documentElement.setAttribute('data-theme', resolved);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0e0e14' : '#f4f4fa');
    };
    apply();
    if (mode === 'system') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [mode]);

  useEffect(() => { document.documentElement.setAttribute('data-accent', accent); }, [accent]);

  // the picture behind the whole app
  useEffect(() => {
    const root = document.documentElement;
    let value = 'none';
    if (bgId === 'custom' && custom) value = `url("${custom}")`;
    else {
      const t = THEME_TEMPLATES.find((x) => x.id === bgId);
      if (t?.bg?.image) value = `url(${t.bg.image})`;
      else if (t?.bg?.css) value = t.bg.css;
    }
    const active = value !== 'none';
    root.style.setProperty('--app-bg-image', value);
    root.style.setProperty('--bg-dim', String(dim));
    root.setAttribute('data-bg', active ? 'image' : 'none');
  }, [bgId, dim, custom]);

  const setTheme = (m) => { setModeState(m); write('ciao_theme', m); };
  const setAccent = (a) => { setAccentState(a); write('ciao_accent', a); };
  const setBgId = (id) => { setBgIdState(id); write('ciao_bg', id); };
  const setDim = (v) => { setDimState(v); write('ciao_bg_dim', String(v)); };

  const applyTemplate = (t) => {
    setTheme(t.mode);
    setAccent(t.accent);
    setBgId(t.bg ? t.id : 'none');
    if (t.bg) setDim(t.dim ?? 0.5);
    setTemplateId(t.id);
    write('ciao_theme_template', t.id);
  };

  // returns false if the browser could not store the picture
  const setCustomBackground = (dataUrl) => {
    try { localStorage.setItem('ciao_bg_custom', dataUrl); } catch { return false; }
    setCustom(dataUrl);
    setBgId('custom');
    if (bgId === 'none') setDim(0.55);
    setTemplateId('custom');
    write('ciao_theme_template', 'custom');
    return true;
  };
  const removeBackground = () => {
    setBgId('none');
    setTemplateId('custom');
    write('ciao_theme_template', 'custom');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: mode, accent, bgId, dim, custom, templateId,
        setTheme: (m) => { setTheme(m); setTemplateId('custom'); write('ciao_theme_template', 'custom'); },
        setAccent: (a) => { setAccent(a); setTemplateId('custom'); write('ciao_theme_template', 'custom'); },
        setDim, applyTemplate, setCustomBackground, removeBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// fixed layer that shows the chosen picture behind everything
export function AppBackdrop() {
  return <div className="app-backdrop" aria-hidden />;
}
