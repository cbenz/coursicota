import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        card: "var(--card)",
        border: "var(--border)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        destructive: "var(--destructive)",
        ring: "var(--ring)",
      },
      spacing: {
        radius: "var(--radius)",
      },
      fontFamily: {
        display: '"IBM Plex Sans", "Segoe UI", sans-serif',
      },
      boxShadow: {
        custom: "var(--shadow)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
    },
  },
  plugins: [],
} satisfies Config;
