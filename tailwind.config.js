/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sudoku: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          active: '#3b82f6',
          highlight: '#1e3a8a33',
          sameDigit: '#3b82f62b',
          conflict: '#ef444433',
          conflictText: '#f87171',
          trying: '#f59e0b',
          backtrack: '#ef4444',
          fixed: '#94a3b8',
          user: '#60a5fa',
        }
      }
    },
  },
  plugins: [],
}

