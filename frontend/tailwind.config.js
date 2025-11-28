/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: 'var(--color-void)',       // Deep Void
        surface: 'var(--color-surface)',    // Dark Gray
        primary: 'var(--color-primary)',    // Amber/Gold
        secondary: 'var(--color-secondary)',  // Retro Orange
        tertiary: 'var(--color-tertiary)',   // Teal/Cyan
        bone: 'var(--color-bone)',       // Off-White
        dim: 'var(--color-dim)',        // Muted Gray
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      boxShadow: {
        'hard': '4px 4px 0px 0px var(--tw-shadow-color)',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, var(--grid-color) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}
