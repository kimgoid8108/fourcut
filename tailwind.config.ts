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
        booth: {
          bg: "#ffffff",
          surface: "#ffffff",
          muted: "#f5f5f4",
          border: "#e7e5e1",
          text: "#232220",
          dim: "#8c887f",
          film: "#232220",
          accent: "#a8622f",
          onvideo: "#f5f3ec",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        vignette: "inset 0 0 120px rgba(0,0,0,0.85)",
        booth: "0 8px 28px rgba(40,34,24,0.14)",
      },
      animation: {
        flash: "flash 0.35s ease-out forwards",
        "grain-shift": "grain-shift 0.5s steps(6) infinite",
        shake: "shake 0.4s ease-in-out",
        "count-enter": "count-enter 0.45s ease-in-out forwards",
        "count-exit": "count-exit 0.45s ease-in-out forwards",
      },
      keyframes: {
        flash: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "grain-shift": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(-2%, -1%)" },
          "50%": { transform: "translate(1%, 2%)" },
          "75%": { transform: "translate(-1%, 1%)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        "count-enter": {
          from: { transform: "translateY(28%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "count-exit": {
          from: { transform: "translateY(0)", opacity: "1" },
          to: { transform: "translateY(-28%)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
