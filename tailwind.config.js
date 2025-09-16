const colors = require("tailwindcss/colors");
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    colors: {
      ...colors, // include all Tailwind colors
      gray: colors.neutral, // override gray
    },
  },
  plugins: [],
};
