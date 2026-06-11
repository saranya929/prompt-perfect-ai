/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#7c6ef5',
        'accent-green': '#00f5a0',
      },
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0e1a 100%)',
        'gradient-light': 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0f9ff 100%)',
      },
    },
  },
  plugins: [],
};
