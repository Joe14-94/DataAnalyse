/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./logic/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./utils.ts"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          200: 'var(--brand-200)',
          300: 'var(--brand-300)',
          400: 'var(--brand-400)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
          900: 'var(--brand-900)',
        },
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        'txt-main': 'var(--txt-main)',
        'txt-secondary': 'var(--txt-secondary)',
        'txt-muted': 'var(--txt-muted)',
        success: {
          bg: 'var(--success-bg)',
          text: 'var(--success-text)',
          border: 'var(--success-border)'
        },
        warning: {
          bg: 'var(--warning-bg)',
          text: 'var(--warning-text)',
          border: 'var(--warning-border)'
        },
        danger: {
          bg: 'var(--danger-bg)',
          text: 'var(--danger-text)',
          border: 'var(--danger-border)'
        },
        info: {
          bg: 'var(--info-bg)',
          text: 'var(--info-text)',
          border: 'var(--info-border)'
        },
        'border-default': 'var(--border-default)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'monospace'],
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'app-base': 'var(--app-font-size)',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }
    }
  },
  plugins: [],
  darkMode: 'class',
}
