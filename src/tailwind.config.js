/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg': 'var(--color-bg)',
        'panel-bg': 'var(--color-panel-bg)',
        'text': 'var(--color-text)',
        'border': 'var(--color-border)',
        'header-bg': 'var(--color-header-bg)',
        'hover-bg': 'var(--color-hover-bg)',
        'accent': 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
      }
    },
  },
  plugins: [],
}