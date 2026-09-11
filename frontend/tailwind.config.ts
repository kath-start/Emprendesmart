import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#328bff',
          600: '#1b69f5',
          700: '#1553e1',
          800: '#1844b6',
          900: '#193d8f',
          950: '#142657',
        },
      },
    },
  },
  plugins: [],
};

export default config;
