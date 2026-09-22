import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light theme
        paper: "#FAFBFD",
        ink: "#0E1420",
        // Dark theme
        void: "#080B12",
        charcoal: "#0F1620",
        // Shared accents
        // Accent colors are CSS variables so they can differ per theme
        // (blue in light mode, gold in dark mode) — see globals.css.
        signal: "rgb(var(--accent) / <alpha-value>)",
        cyan: "rgb(var(--accent-2) / <alpha-value>)",
        cyanDeep: "rgb(var(--accent-2-deep) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
        glass: "20px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(15, 23, 42, 0.08)",
        "glass-dark": "0 8px 40px rgba(0, 0, 0, 0.5)",
        glow: "0 0 40px rgb(var(--accent) / 0.35)",
        "glow-cyan": "0 0 40px rgb(var(--accent-2) / 0.3)",
      },
      borderRadius: {
        glass: "1.75rem",
      },
      animation: {
        ticker: "ticker 32s linear infinite",
        float: "float 6s ease-in-out infinite",
        "aurora-shift": "aurora-shift 18s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "aurora-shift": {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)" },
          "33%": { transform: "translate(4%, -6%) scale(1.08)" },
          "66%": { transform: "translate(-3%, 4%) scale(0.96)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
