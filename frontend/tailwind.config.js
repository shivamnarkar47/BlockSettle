/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
        },
        border: '#475569',
        text: {
          primary: '#f8fafc',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        accent: {
          amber: '#f59e0b',
          amberDim: '#78350f',
          emerald: '#10b981',
          emeraldDim: '#064e3b',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      }
    },
  },
  plugins: [],
}
