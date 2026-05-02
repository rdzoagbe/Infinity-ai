/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { midnight: '#101116', glass: '#1A1C23', cyan: '#00E5FF', magenta: '#FF00FF' },
      boxShadow: {
        cyan: '0 0 28px rgba(0,229,255,.28)',
        magenta: '0 0 28px rgba(255,0,255,.22)',
        panel: '0 24px 80px rgba(0,0,0,.35)',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
