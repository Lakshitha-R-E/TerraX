/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c2d3ff',
          300: '#94affc',
          400: '#6083f9',
          500: '#3b5bf5',
          600: '#2940e8',
          700: '#2232d0',
          800: '#1e2aa8',
          900: '#1e2985',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          700: '#334155',
          800: '#1e293b',
          850: '#172033',
          900: '#0f172a',
          950: '#080e1a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
