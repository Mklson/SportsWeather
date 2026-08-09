import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tailwind: "#10b981",
        crosswind: "#f59e0b",
        headwind: "#ef4444",
        rain: {
          light: "#bfdbfe",
          medium: "#3b82f6",
          heavy: "#1d4ed8",
        },
        // Sampled from the logo (public/Logo with text on side-cropped.png) — navy
        // is the primary brand color, green is a deliberately sparing accent.
        brand: {
          navy: "#0b2e4d",
          "navy-dark": "#082238",
          green: "#4caf50",
          "green-dark": "#2e7d32",
          "green-soft": "#eaf6ea",
          "green-border": "#bfe3c0",
          cream: "#faf3e0",
          "cream-border": "#e6d9a8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
