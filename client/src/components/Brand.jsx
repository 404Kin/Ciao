import { useEffect, useId, useState } from 'react';

// If you put your own picture at  client/public/logo.png  it replaces the built-in icon everywhere.
let customLogo; // undefined = unknown, true/false once checked
let checking = null;
function checkCustomLogo() {
  if (customLogo !== undefined) return Promise.resolve(customLogo);
  if (!checking) {
    checking = new Promise((resolve) => {
      const im = new Image();
      im.onload = () => { customLogo = im.naturalWidth > 0; resolve(customLogo); };
      im.onerror = () => { customLogo = false; resolve(false); };
      im.src = '/logo.png';
    });
  }
  return checking;
}
function useCustomLogo() {
  const [has, setHas] = useState(customLogo === true);
  useEffect(() => {
    let alive = true;
    checkCustomLogo().then((v) => alive && setHas(v));
    return () => { alive = false; };
  }, []);
  return has;
}

// Ciao's built-in icon: a speech bubble holding a music note
export function LogoMark({ size = 40, className = '' }) {
  const id = useId();
  const custom = useCustomLogo();
  if (custom) {
    return <img src="/logo.png" width={size} height={size} alt="Ciao" className={`object-cover ${className}`} style={{ borderRadius: size * 0.3 }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Ciao">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(var(--accent))" />
          <stop offset="1" stopColor="rgb(var(--accent))" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill={`url(#${id})`} />
      <path d="M32 10.5C45.6 10.5 55.5 19.2 55.5 30.3C55.5 41.4 45.6 50 32 50C29.4 50 26.9 49.7 24.6 49L14.5 54.5L17.4 45.2C12.7 41.8 8.5 36.9 8.5 30.3C8.5 19.2 18.4 10.5 32 10.5Z" fill="#fff" />
      <ellipse cx="27" cy="37" rx="5.2" ry="4" transform="rotate(-18 27 37)" fill={`url(#${id})`} />
      <path d="M31.2 35.6V20.2L41.8 22.8V25.6L34.4 23.8V33" fill="none" stroke={`url(#${id})`} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="37.2" cy="34.2" r="3.9" fill={`url(#${id})`} />
    </svg>
  );
}

// icon + script wordmark
export function Logo({ size = 40, text = true, className = '', textClassName = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {text && <span className={`font-script font-bold text-gradient leading-none ${textClassName}`} style={{ fontSize: size * 1.05 }}>Ciao</span>}
    </span>
  );
}
