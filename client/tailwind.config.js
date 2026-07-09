/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Notion-like aesthetic
        notion: {
          bg: {
            light: '#ffffff',
            dark: '#191919',
            sidebarLight: '#f5f5f4',
            sidebarDark: '#202020'
          },
          border: {
            light: '#e9e9e7',
            dark: '#2e2e2e'
          },
          text: {
            light: '#37352f',
            dark: '#d4d4d4',
            mutedLight: '#7c7b77',
            mutedDark: '#808080'
          },
          hover: {
            light: 'rgba(55, 53, 47, 0.08)',
            dark: 'rgba(255, 255, 255, 0.055)'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
  darkMode: 'class'
}
