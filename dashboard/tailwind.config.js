/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        obsidian: '#000000',
        terminal: '#ffffff',
        muted: '#71717a',
      },
      letterSpacing: {
        widest: '0.25em',
        ultra: '0.35em',
      },
    },
  },
  plugins: [],
}
