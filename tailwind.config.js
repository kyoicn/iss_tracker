/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          app: '#0d1117',
          map: '#0a0f17',
          panel: '#11161f',
          card: '#1a212e',
          glass: 'rgba(22,27,34,0.78)',
          'glass-soft': 'rgba(22,27,34,0.62)',
        },
        accent: {
          cyan: '#22d3ee',
          'cyan-soft': '#7dd3fc',
          green: '#22c55e',
          amber: '#f59e0b',
        },
        text: {
          primary: '#f0f6fc',
          secondary: '#e6edf3',
          muted: '#8b949e',
          dim: '#6e7681',
        },
        border: {
          subtle: 'rgba(240,246,252,0.08)',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
