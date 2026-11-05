/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f6', 100: '#d5ecea', 200: '#aededa', 300: '#76c6c3',
          400: '#43a8a6', 500: '#2f8c8c', 600: '#286f72', 700: '#245a5d',
          800: '#224a4d', 900: '#1e3e41',
        },
        accent: '#e76f51',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.06)',
      },
    },
  },
  plugins: [],
};
