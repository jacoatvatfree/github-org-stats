/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gb': '#0069B3',      // green-blue
        'md': '#B01867',      // magenta-dye
        'lw': '#D5D8E9',      // lavender-web
        'mp': '#E4007D',      // mexican-pink
        secondary: {
          DEFAULT: '#0069B3',  // green-blue
          50: '#E6F2FA',
          100: '#CCE5F5',
          200: '#99CBEB',
          300: '#66B2E0',
          400: '#3398D6',
          500: '#0069B3',
          600: '#005490',
          700: '#003F6D',
          800: '#002A49',
          900: '#001526'
        },
        primary: {
          DEFAULT: '#B01867',  // magenta-dye
          50: '#FCE8F1',
          100: '#F9D1E3',
          200: '#F3A3C7',
          300: '#ED75AB',
          400: '#E7478F',
          500: '#B01867',
          600: '#8D1352',
          700: '#6A0E3E',
          800: '#470A29',
          900: '#240515'
        },
        accent: {
          DEFAULT: '#E4007D',  // mexican-pink
          50: '#FEE5F2',
          100: '#FCCCE5',
          200: '#F999CB',
          300: '#F666B1',
          400: '#F33397',
          500: '#E4007D',
          600: '#B60064',
          700: '#89004B',
          800: '#5B0032',
          900: '#2E0019'
        }
      }
    },
  },
  plugins: [],
}
