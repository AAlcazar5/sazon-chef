// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Warm cream surface tokens (replaces cold gray-50)
        surface: '#FAF7F4',
        'surface-tint': '#F5F0EB',
        // Dark mode surface tokens
        'surface-dark': '#0F0F0F',
        'surface-tint-dark': '#1C1C1E',
        'card-dark': '#1C1C1E',
        'card-raised-dark': '#2C2C2E',
        'card-overlay-dark': '#3A3A3C',
      },
      borderRadius: {
        'card': '20px',    // Content cards, magazine-style surfaces
        'input': '14px',   // Form inputs
        'sheet': '28px',   // Bottom sheet top corners
      },
    },
  },
  plugins: [],
}