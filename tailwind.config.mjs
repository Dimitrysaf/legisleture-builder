/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif"', 'Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['light'],
          primary: '#003476',
          'primary-content': '#ffffff',
          'base-100': '#ffffff',
          'base-200': '#f5f6f8',
          'base-300': '#e8eaed',
        },
      },
    ],
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
}
