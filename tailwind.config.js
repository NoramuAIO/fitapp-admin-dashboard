/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F0F0F',
          card: '#1A1A1A',
          hover: '#252525',
          border: '#2A2A2A',
        },
        primary: {
          green: '#5DD97C',
          orange: '#FF6B4A',
          purple: '#9B6FFF',
          blue: '#6B9FFF',
        },
      },
    },
  },
  plugins: [],
}
