/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Ramotion — Light Mode
      colors: {
        'r-bg':          '#fafafa',  // background      — page background
        'r-surface':     '#ffffff',  // surface         — cards, panels, list, modals
        'r-hover':       '#f0f0f0',  // hover on surface
        'r-hover2':      '#e5e5e5',  // stronger hover / active chips
        'r-primary':     '#2f77ea',  // primary         — blue accent
        'r-text':        '#141414',  // text-primary
        'r-muted':       '#6f7984',  // text-muted
        'r-border':      '#e0e0e0',  // border-light
        'r-border-dark': '#000000',  // border-dark
        'r-on-primary':  '#ffffff',  // text-inverse    — white text over blue
      },
      fontFamily: {
        // Ramotion uses Graphik Web; Inter is the closest freely-embeddable match
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Ramotion radius scale: sm=8px, md=20px, lg=22px
      borderRadius: {
        'none': '0',
        'sm':   '6px',
        DEFAULT: '8px',   // `rounded`     → 8px  (Ramotion sm)
        'md':   '12px',   // `rounded-md`  → 12px
        'lg':   '14px',   // `rounded-lg`  → 14px (cards, inputs)
        'xl':   '20px',   // `rounded-xl`  → 20px (Ramotion md — modals, panels)
        '2xl':  '22px',   // `rounded-2xl` → 22px (Ramotion lg)
        '3xl':  '28px',
        'full': '9999px',
        // Named Ramotion tokens
        'r-sm': '8px',
        'r-md': '20px',
        'r-lg': '22px',
      },
      fontSize: {
        // Ramotion: body 16px · 1.5lh; caption 13px · 1.4lh; headings · 1.2lh
        'xs':   ['13px', { lineHeight: '1.4' }],   // Ramotion caption
        'sm':   ['14px', { lineHeight: '1.5' }],
        'base': ['16px', { lineHeight: '1.5' }],   // Ramotion body
        'lg':   ['18px', { lineHeight: '1.5' }],   // Ramotion body-lg
        'xl':   ['20px', { lineHeight: '1.25' }],
        '2xl':  ['24px', { lineHeight: '1.2' }],   // Ramotion heading-lg
        '3xl':  ['32px', { lineHeight: '1.2' }],   // Ramotion heading-xl
        '4xl':  ['48px', { lineHeight: '1.1' }],
        '5xl':  ['60px', { lineHeight: '1.05' }],
        '6xl':  ['72px', { lineHeight: '1.0' }],
        '7xl':  ['92px', { lineHeight: '1.0' }],   // Ramotion display
      },
      lineHeight: {
        'tight':   '1.2',
        'snug':    '1.35',
        'normal':  '1.5',
        'relaxed': '1.625',
      },
      maxWidth: {
        'r-container': '1440px',  // Ramotion max width
      },
    },
  },
  plugins: [],
}
