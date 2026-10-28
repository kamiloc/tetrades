/** @type {import('tailwindcss').Config} */
// Colors, radii, and text presets come from lib/tokens.js (the design-handoff
// tokens), so NativeWind classes and lib/theme.ts never drift apart.
const { colors, radius, textPresets } = require('./lib/tokens.js');

const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const colorClasses = Object.fromEntries(
  Object.entries(colors).map(([key, value]) => [kebab(key), value]),
);

const radiusClasses = Object.fromEntries(
  Object.entries(radius).map(([key, value]) => [key, `${value}px`]),
);

const presetClasses = Object.fromEntries(
  Object.entries(textPresets).map(([name, [size, lineHeight, letterSpacing, fontWeight]]) => [
    name,
    [
      `${size}px`,
      {
        ...(lineHeight === undefined ? {} : { lineHeight: `${lineHeight}px` }),
        letterSpacing: `${letterSpacing}px`,
        fontWeight,
      },
    ],
  ]),
);

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: colorClasses,

      fontSize: {
        // Raw scale (kept for existing screens)
        badge: '10px',
        caption: '11px',
        small: '12px',
        footnote: '13px',
        body: '14px',
        'body-lg': '15px',
        callout: '17px',
        title3: '19px',
        title2: '22px',
        title1: '26px',
        display: '34px',
        // Role presets from the design handoff (text.* in tokens/typography.ts)
        ...presetClasses,
      },

      fontWeight: {
        // 'regular' is not in Tailwind defaults; medium/semibold/bold are already present
        regular: '400',
      },

      // Spacing tokens map 1:1 to Tailwind's default 4-pt scale
      // (xs=4→p-1, sm=8→p-2, md=12→p-3, lg=16→p-4, xl=20→p-5,
      //  2xl=24→p-6, 3xl=32→p-8) — no custom spacing needed.

      borderRadius: radiusClasses,
    },
  },
  plugins: [],
};
