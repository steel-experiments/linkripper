// ABOUTME: Tailwind CSS config — content globs and the LINKRIPPER theme tokens.
// ABOUTME: Dark-first palette tuned for an archive grid UI.
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b0c0f",
          800: "#13151a",
          700: "#1c1f27",
          600: "#2a2e3a",
        },
        accent: "#ff5c3a",
      },
    },
  },
  plugins: [],
} satisfies Config;
