import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08090c",
        surface: "#121419",
        surface2: "#191c22",
        border: "#272b33",
        muted: "#8a909c",
        accent: "#f59e0b",
        accent2: "#f97316",
        heavy: "#f43f5e",
        medium: "#f59e0b",
        light: "#34d399",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 10px 30px -16px rgba(0,0,0,0.7)",
        glow: "0 8px 24px -8px rgba(245,158,11,0.45)",
      },
      borderRadius: {
        "2xl": "1.1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
