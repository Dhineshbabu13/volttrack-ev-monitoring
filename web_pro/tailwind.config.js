/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E30613',
          'red-hover': '#C0040F',
          'red-dark': '#9B030C',
          'red-light': '#FEE2E2',
          'red-soft': '#FFF1F2',
          dark: '#111111',
          charcoal: '#1E293B',
          gray: '#555555',
          'gray-light': '#F8F9FA',
          border: '#E2E8F0',
        },
        ev: {
          green: '#10B981',
          blue: '#0284C7',
          amber: '#F59E0B',
          red: '#E30613'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'clean-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'clean-md': '0 4px 12px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
        'clean-lg': '0 12px 28px -4px rgba(0, 0, 0, 0.08), 0 4px 10px -3px rgba(0, 0, 0, 0.04)',
        'red-sm': '0 4px 14px 0 rgba(227, 6, 19, 0.25)',
      },
      borderRadius: {
        'card': '12px',
        'input': '8px',
      }
    },
  },
  plugins: [],
}
