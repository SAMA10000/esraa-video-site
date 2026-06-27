/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'midnight': '#0a0a14',
        'deep-purple': '#1a1a2e',
        'darker-purple': '#0f0f1a',
        'gold': '#d4af37',
        'gold-light': '#f4d03f',
        'gold-dark': '#b8960c',
        'orange': '#ff6b1a',
        'orange-light': '#ff8a3d',
        'orange-dark': '#e55a00',
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      aspectRatio: {
        '9/16': '9 / 16',
      },
    },
  },
  plugins: [],
};
