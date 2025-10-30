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
    extend: {
      boxShadow: {
        "soft-xl":
          "rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 56px",
      },
    },
  },
  plugins: [],
};
