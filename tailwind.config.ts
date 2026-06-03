import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#000000",
        surface: "#0A0A0F",
        elevated: "#13131A",
        accent: {
          DEFAULT: "#4D9BFF",
          glow: "#00D4FF",
        },
        field: "#FFD600",
        text: {
          primary: "#FFFFFF",
          secondary: "#B4B4BE",
          tertiary: "#6B6B7A",
        },
      },
      borderColor: {
        subtle: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "20px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 8px 32px rgba(0,0,0,0.4)",
        glow: "0 40px 80px -20px rgba(77,155,255,0.4)",
      },
      transitionTimingFunction: {
        ease: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) both",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
