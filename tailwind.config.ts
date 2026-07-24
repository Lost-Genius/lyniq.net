import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0a0a0f",
          card: "#12121a",
          border: "#1f1f2e",
          cyan: "#00f0ff",
          magenta: "#ff00aa",
          green: "#39ff14",
          purple: "#b026ff",
          text: "#e0e0ff",
          muted: "#8888aa",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
        display: ["var(--font-display)", "Orbitron", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.3)",
        "neon-magenta": "0 0 10px rgba(255, 0, 170, 0.5), 0 0 20px rgba(255, 0, 170, 0.3)",
        "neon-green": "0 0 10px rgba(57, 255, 20, 0.5)",
      },
      animation: {
        "pulse-neon": "pulse-neon 2s ease-in-out infinite",
        glitch: "glitch 1s linear infinite",
      },
      keyframes: {
        "pulse-neon": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
