/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#030306',
        ink: '#0a0a10',
        ember: '#c8102e',
        crimson: '#8f0a1f',
        gold: '#e8b04b',
        brass: '#b8862f',
        bone: '#efe9de',
        mist: '#9a98a6',
        space: '#2f7bff',
        mind: '#ffd23f',
        reality: '#ff2a3d',
        power: '#a43bff',
        time: '#22e58a',
        soul: '#ff8a1f',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Oswald', 'Impact', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: { cinema: '0.42em' },
    },
  },
  plugins: [],
};
