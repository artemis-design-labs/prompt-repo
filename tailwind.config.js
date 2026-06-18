/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Momentum Design Lab — Dark Mode ("Dark-first · dual theme")
      colors: {
        'r-bg':          '#030303',  // bg-dark      — page background
        'r-surface':     '#1d1d1d',  // surface-dark — cards, panels, modals
        'r-hover':       '#2a2a2a',  // hover on surface
        'r-hover2':      '#3a3a3a',  // stronger hover / active chips
        'r-primary':     '#fdb447',  // primary      — amber accent
        'r-text':        '#f7f7f7',  // surface-light as on-dark text
        'r-muted':       '#a3a3a3',  // text-muted
        'r-border':      '#333333',  // subtle dark borders
        'r-border-dark': '#000000',  // text-accent / hardest border
        'r-on-primary':  '#141414',  // text-on-dark — dark text over amber
      },
      fontFamily: {
        // Momentum uses Open Sauce Sans
        sans: ['Open Sauce Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Momentum radius scale: sm=6px, md=12px, lg=20px, full=∞
      borderRadius: {
        'none': '0',
        'sm':   '4px',
        DEFAULT: '6px',   // `rounded`     → 6px  (Momentum sm)
        'md':   '12px',   // `rounded-md`  → 12px (Momentum md)
        'lg':   '12px',   // `rounded-lg`  → 12px (cards, inputs)
        'xl':   '20px',   // `rounded-xl`  → 20px (Momentum lg — modals, panels)
        '2xl':  '20px',   // `rounded-2xl` → 20px
        '3xl':  '24px',
        'full': '9999px',
        // Named Momentum tokens
        'r-sm': '6px',
        'r-md': '12px',
        'r-lg': '20px',
      },
      fontSize: {
        // Momentum: body 16px · 1.5lh; light-weight large headings · 1.1lh
        'xs':   ['13px', { lineHeight: '1.4' }],
        'sm':   ['14px', { lineHeight: '1.5' }],
        'base': ['16px', { lineHeight: '1.5' }],
        'lg':   ['18px', { lineHeight: '1.4' }],
        'xl':   ['22px', { lineHeight: '1.2' }],
        '2xl':  ['28px', { lineHeight: '1.15' }],
        '3xl':  ['36px', { lineHeight: '1.2' }],   // Momentum H3
        '4xl':  ['48px', { lineHeight: '1.1' }],
        '5xl':  ['60px', { lineHeight: '1.1' }],   // Momentum H2
        '6xl':  ['72px', { lineHeight: '1.1' }],   // Momentum Display
        '7xl':  ['92px', { lineHeight: '1.05' }],
      },
      lineHeight: {
        'tight':   '1.1',
        'snug':    '1.2',
        'normal':  '1.5',
        'relaxed': '1.625',
      },
    },
  },
  plugins: [],
}
