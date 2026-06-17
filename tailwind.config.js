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
      borderRadius: {
        'r-sm': '8px',
        'r-md': '20px',
        'r-lg': '22px',
      },
    },
  },
  plugins: [],
}
