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
        line: {
          green: '#00B900',
          blue: '#0084FF',
          gray: '#F5F5F5',
        }
      }
    },
  },
  plugins: [],
}
