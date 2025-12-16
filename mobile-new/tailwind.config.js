/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e6e8f0',
          100: '#b3b9d4',
          500: '#000940',
          600: '#000833',
          700: '#00020d',
          800: '#00020d',
          900: '#00020d',
        },
        gold: {
          50: '#fef9ed',
          100: '#fcefc7',
          400: '#e7b73c',
          500: '#e7b73c',
          600: '#d4a022',
          700: '#a67b1a',
        },
      },
      fontFamily: {
        sans: ['SF Pro Display', 'SF Pro Text', 'Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}