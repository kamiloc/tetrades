import type { Config } from 'tailwindcss';

import { colors } from './lib/tokens';

// Colors come from the design handoff (lib/tokens.ts) so web never hard-codes
// a handoff color. camelCase keys become kebab-case classes (onInk → on-ink).
const kebab = (key: string): string => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const colorClasses = Object.fromEntries(
  Object.entries(colors).map(([key, value]) => [kebab(key), value]),
);

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: colorClasses,
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      // Radii and shadows from the web prototype (web/index.html :root).
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '9px',
        lg: '12px',
        xl: '16px',
        pill: '999px',
      },
      boxShadow: {
        xs: '0 1px 0 rgba(15,23,42,0.04)',
        sm: '0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.03)',
        md: '0 6px 18px -8px rgba(15,23,42,0.10), 0 2px 4px rgba(15,23,42,0.04)',
        cta: '0 6px 16px -4px rgba(26,107,255,0.32)',
        dialog: '0 24px 60px -12px rgba(11,18,32,0.35)',
      },
      minWidth: {
        portal: '1024px',
      },
    },
  },
  plugins: [],
};

export default config;
