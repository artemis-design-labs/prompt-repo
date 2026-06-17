/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'r-bg':          '#fafafa',
        'r-surface':     '#ffffff',
        'r-hover':       '#f0f0f0',
        'r-hover2':      '#e5e5e5',
        'r-primary':     '#2f77ea',
        'r-text':        '#141414',
        'r-muted':       '#6f7984',
        'r-border':      '#e0e0e0',
        'r-border-dark': '#000000',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Ramotion radius scale: sm=8px, md=20px, lg=22px
      // Mapped across the Tailwind scale for gradual progression
      borderRadius: {
        'none': '0',
        'sm':   '4px',
        DEFAULT: '8px',   // `rounded`    → 8px  (Ramotion sm)
        'md':   '10px',
        'lg':   '14px',   // `rounded-lg` → 14px (cards, inputs)
        'xl':   '20px',   // `rounded-xl` → 20px (Ramotion md: modals, panels)
        '2xl':  '22px',   // `rounded-2xl`→ 22px (Ramotion lg)
        '3xl':  '28px',
        'full': '9999px',
        // Named Ramotion tokens
        'r-sm': '8px',
        'r-md': '20px',
        'r-lg': '22px',
      },
      fontSize: {
        // Ramotion caption: 13px · 1.4lh
        'xs':   ['13px', { lineHeight: '1.4' }],
        // UI labels: 14px · 1.5lh
        'sm':   ['14px', { lineHeight: '1.5' }],
        // Body: 16px · 1.5lh
        'base': ['16px', { lineHeight: '1.5' }],
        // Body LG: 18px · 1.5lh
        'lg':   ['18px', { lineHeight: '1.5' }],
        // Heading SM: 20px · 1.2lh
        'xl':   ['20px', { lineHeight: '1.2' }],
        // Heading LG: 24px · 1.2lh
        '2xl':  ['24px', { lineHeight: '1.2' }],
        // Heading XL: 32px · 1.2lh
        '3xl':  ['32px', { lineHeight: '1.2' }],
        // Display: 48px · 1.0lh
        '4xl':  ['48px', { lineHeight: '1.0' }],
        '5xl':  ['60px', { lineHeight: '1.0' }],
        '6xl':  ['72px', { lineHeight: '1.0' }],
        '7xl':  ['92px', { lineHeight: '1.0' }],
      },
      lineHeight: {
        'tight':   '1.2',
        'snug':    '1.35',
        'normal':  '1.5',
        'relaxed': '1.625',
      },
    },
  },
  plugins: [],
}
