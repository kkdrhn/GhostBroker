/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ghost: {
          900: "#0a0a0f",
          800: "#11111a",
          700: "#1a1a2e",
          600: "#16213e",
          500: "#0f3460",
          accent: "#7c3aed",
          neon:   "#a78bfa",
          green:  "#10b981",
          red:    "#ef4444",
          gold:   "#f59e0b",
          cyan:   "#06b6d4",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
      animation: {
        "pulse-slow":    "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow":          "glow 2s ease-in-out infinite alternate",
        "slide-in-left": "slideInLeft 0.3s ease-out",
      },
      keyframes: {
        glow: {
          from: { boxShadow: "0 0 5px #7c3aed, 0 0 10px #7c3aed" },
          to:   { boxShadow: "0 0 20px #a78bfa, 0 0 40px #7c3aed" },
        },
        slideInLeft: {
          from: { transform: "translateX(-20px)", opacity: "0" },
          to:   { transform: "translateX(0)",     opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
