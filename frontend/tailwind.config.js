/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbf3',
          100: '#d6f5e3',
          200: '#b0eac9',
          300: '#7fd8a8',
          400: '#4bbf83',
          500: '#27a467',
          600: '#1a8452',
          700: '#166a44',
          800: '#145438',
          900: '#114530',
        },
      },
    },
  },
  plugins: [],
};