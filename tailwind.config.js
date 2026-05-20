/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        head: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        bg:       '#060609',
        bg2:      '#09090e',
        surface:  '#0f1018',
        surface2: '#14151f',
        surface3: '#1b1c2a',
        border:   '#1e2030',
        border2:  '#282940',
        accent:   '#f0b429',
        accent2:  '#c9960e',
        danger:   '#ff4d6a',
        novos:    '#4d9fff',
        neg:      '#ff8c42',
        fechados: '#00c896',
        purple:   '#9d6fff',
        muted:    '#4c5070',
        text2:    '#8f94b0',
      },
      animation: {
        'ambient':    'ambientDrift 30s ease-in-out infinite alternate',
        'logo-pulse': 'logoPulse 4s ease-in-out infinite',
        'bar-in':     'barSlideIn 0.3s cubic-bezier(0.22,1.2,0.36,1)',
        'card-in':    'cardStaggerIn 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':    'fadeIn 0.35s cubic-bezier(0.16,1,0.3,1)',
        'shimmer':    'shimmer 2.6s infinite',
      },
      keyframes: {
        ambientDrift: {
          '0%':   { transform: 'translate(0,0) scale(1)' },
          '33%':  { transform: 'translate(22px,-32px) scale(1.03)' },
          '66%':  { transform: 'translate(-14px,16px) scale(0.97)' },
          '100%': { transform: 'translate(10px,22px) scale(1.02)' },
        },
        logoPulse: {
          '0%,100%': { boxShadow: '0 0 22px rgba(240,180,41,0.44),inset 0 1px 0 rgba(255,255,255,0.44)' },
          '50%':     { boxShadow: '0 0 38px rgba(240,180,41,0.76),0 0 0 6px rgba(240,180,41,0.07),inset 0 1px 0 rgba(255,255,255,0.44)' },
        },
        barSlideIn: {
          from: { transform: 'scaleY(0)', opacity: '0' },
          to:   { transform: 'scaleY(1)', opacity: '1' },
        },
        cardStaggerIn: {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          to:   { opacity: '1', transform: 'none' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'none' },
        },
        shimmer: {
          '100%': { left: '200%' },
        },
      },
    },
  },
  plugins: [],
}