const colors = require("tailwindcss/colors");
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gray: colors.neutral, // replaces Tailwind’s default gray with neutral
      },
    },
  },
  plugins: [],
};
