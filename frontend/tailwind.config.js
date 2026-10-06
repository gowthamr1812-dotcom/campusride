/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          bg: "#E8EDF3",
          primary: "#2563EB",
          success: "#16A34A",
          warning: "#F59E0B",
          danger: "#DC2626",
          dark: "#1E293B",
          surface: "#F1F5F9",
          border: "#CBD5E1",
        }
      },
      boxShadow: {
        'neu-flat': '6px 6px 12px #c5c9cf, -6px -6px 12px #ffffff',
        'neu-pressed': 'inset 4px 4px 8px #c5c9cf, inset -4px -4px 8px #ffffff',
        'neu-card': '8px 8px 16px #d1d5db, -8px -8px 16px #ffffff',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      }
    },
  },
  plugins: [],
}
