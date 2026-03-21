import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "foreground-secondary": "hsl(var(--foreground-secondary))",
        "foreground-tertiary": "hsl(var(--foreground-tertiary))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          active: "hsl(var(--primary-active))",
          subtle: "hsl(var(--primary-subtle))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        "accent-brand": {
          DEFAULT: "hsl(var(--accent-brand))",
          hover: "hsl(var(--accent-brand-hover))",
          subtle: "hsl(var(--accent-brand-subtle))",
          foreground: "hsl(var(--accent-brand-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "surface-raised": "hsl(var(--surface-raised))",
        "surface-overlay": "hsl(var(--surface-overlay))",
        elevated: "hsl(var(--surface-raised))",
        success: {
          DEFAULT: "hsl(var(--success))",
          bg: "hsl(var(--success-bg))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          bg: "hsl(var(--warning-bg))",
          foreground: "hsl(var(--warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          bg: "hsl(var(--error-bg))",
          foreground: "hsl(var(--error-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        position: {
          gk: "hsl(var(--position-gk))",
          def: "hsl(var(--position-def))",
          mid: "hsl(var(--position-mid))",
          fwd: "hsl(var(--position-fwd))",
          atk: "hsl(var(--position-atk))",
        },
        result: {
          win: "hsl(var(--result-win))",
          draw: "hsl(var(--result-draw))",
          loss: "hsl(var(--result-loss))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: [
          "2.25rem",
          {
            lineHeight: "1.1",
            fontWeight: "700",
            letterSpacing: "-0.02em",
          },
        ],
        "page-title": [
          "1.875rem",
          {
            lineHeight: "1.2",
            fontWeight: "700",
            letterSpacing: "-0.02em",
          },
        ],
        "section-title": [
          "1.25rem",
          {
            lineHeight: "1.3",
            fontWeight: "600",
            letterSpacing: "-0.01em",
          },
        ],
        "card-title": [
          "1rem",
          {
            lineHeight: "1.4",
            fontWeight: "600",
            letterSpacing: "0",
          },
        ],
        "body-lg": [
          "1rem",
          {
            lineHeight: "1.5",
            fontWeight: "400",
            letterSpacing: "0",
          },
        ],
        "body-sm": [
          "0.875rem",
          {
            lineHeight: "1.5",
            fontWeight: "400",
            letterSpacing: "0",
          },
        ],
        label: [
          "0.75rem",
          {
            lineHeight: "1.4",
            fontWeight: "500",
            letterSpacing: "0.08em",
          },
        ],
        caption: [
          "0.6875rem",
          {
            lineHeight: "1.3",
            fontWeight: "500",
            letterSpacing: "0.04em",
          },
        ],
        "data-lg": [
          "1.5rem",
          {
            lineHeight: "1.2",
            fontWeight: "700",
            letterSpacing: "-0.01em",
          },
        ],
        "data-sm": [
          "1.125rem",
          {
            lineHeight: "1.2",
            fontWeight: "600",
            letterSpacing: "0",
          },
        ],
      },
      spacing: {
        sidebar: "18rem",
        navbar: "3.5rem",
        content: "1.5rem",
      },
      zIndex: {
        base: "0",
        raised: "10",
        dropdown: "20",
        sticky: "30",
        overlay: "40",
        sidebar: "50",
        modal: "60",
        toast: "70",
        tooltip: "80",
      },
      boxShadow: {
        float: "0 8px 40px hsl(210 36% 5% / 0.6)",
        scroll: "0 1px 20px hsl(210 36% 5% / 0.4)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
