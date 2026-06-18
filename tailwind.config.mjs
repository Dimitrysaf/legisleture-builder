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
      {
        dark: {
          ...require('daisyui/src/theming/themes')['dark'],
          primary: '#4d9de0',
          'primary-content': '#ffffff',
          'base-100': '#1e1e2e',
          'base-200': '#181825',
          'base-300': '#313244',
          'base-content': '#cdd6f4',
          'neutral': '#313244',
          'neutral-content': '#cdd6f4',
        },
      },
      {
        macos: {
          ...require('daisyui/src/theming/themes')['light'],
          primary: '#0079d8',
          'primary-content': '#ffffff',
          'base-100': '#f2f2f2',
          'base-200': '#dcdcdc',
          'base-300': '#c0c0c0',
          'base-content': '#1a1a1a',
          'neutral': '#d0d0d0',
          'neutral-content': '#222222',
        },
      },
    ],
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
}
