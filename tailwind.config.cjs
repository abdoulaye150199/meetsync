/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0d3b3b',
        'primary-dark': '#00333C',
        'primary-light': '#1a5555',
        'text-dark': '#0d3b3b',
        'text-muted': '#6c757d',
        'off-white': '#f8f9fa',
        'gray-light': '#e9ecef',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        logo: ['"Jersey 10"', 'cursive'],
      },
    },
  },
  plugins: [],
};
