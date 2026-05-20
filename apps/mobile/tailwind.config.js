/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Surfaces
        ink:    '#0B1220',
        ink2:   '#131B2E',
        paper:  '#FFFFFF',
        canvas: '#F4F6FA',
        line:   '#E5E8EE',

        // Text
        text:           '#0F172A',
        muted:          '#6B7280',
        subtle:         '#9AA3B2',
        'on-ink':       '#FFFFFF',
        'on-ink-muted': 'rgba(255,255,255,0.55)',

        // Brand / Accent
        blue:       '#1A6BFF',
        'blue-tint': '#E8F0FF',
        'blue-line': '#D8E4FB',

        // Status
        pending:      '#B5651D',
        'pending-tint': '#FFF3E0',

        // Tab bar
        'tab-active':    '#1A6BFF',
        'tab-inactive':  '#8A93A4',
        'tab-bar-bg':    '#FFFFFF',
        'tab-bar-border':'#E5E8EE',

        // Translucent on dark header
        'header-chip-bg':     'rgba(255,255,255,0.08)',
        'header-chip-border': 'rgba(255,255,255,0.12)',
        'header-hairline':    'rgba(255,255,255,0.06)',
      },

      fontSize: {
        badge:    '10px',
        caption:  '11px',
        small:    '12px',
        footnote: '13px',
        body:     '14px',
        'body-lg':'15px',
        callout:  '17px',
        title3:   '19px',
        title2:   '22px',
        title1:   '26px',
        display:  '34px',
      },

      fontWeight: {
        // 'regular' is not in Tailwind defaults; medium/semibold/bold are already present
        regular: '400',
      },

      // Spacing tokens map 1:1 to Tailwind's default 4-pt scale
      // (xs=4→p-1, sm=8→p-2, md=12→p-3, lg=16→p-4, xl=20→p-5,
      //  2xl=24→p-6, 3xl=32→p-8) — no custom spacing needed.

      borderRadius: {
        xs:    '4px',
        sm:    '6px',
        md:    '9px',
        lg:    '12px',
        xl:    '16px',
        '2xl': '18px',
        pill:  '999px',
      },
    },
  },
  plugins: [],
};
