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
        // Light & Dark glass backgrounds and borders
        glass: {
          light: 'rgba(255, 255, 255, 0.85)',
          lightBorder: 'rgba(226, 232, 240, 0.9)',
          dark: 'rgba(15, 23, 42, 0.85)',
          darkBorder: 'rgba(51, 65, 85, 0.6)',
        },
        brand: {
          500: '#2563eb', // ko'k
          600: '#1d4ed8',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
