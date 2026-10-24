/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        surface2: v('surface2'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        accent: v('accent'),
        accent2: v('accent2'),
        danger: v('danger'),
        ok: v('ok'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        script: ['Caveat', 'cursive'],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.25)',
        glow: '0 8px 30px -8px rgb(var(--accent) / 0.55)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.6)', opacity: 0 }, '70%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
        rise: { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        eq: { '0%,100%': { transform: 'scaleY(.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        pop: 'pop .25s ease-out',
        rise: 'rise .25s ease-out',
        eq: 'eq 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
