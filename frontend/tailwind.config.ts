import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base colors (shadcn/ui compatible)
        background: {
          DEFAULT: "hsl(var(--background))",
          secondary: "hsl(var(--background-secondary))",
          tertiary: "hsl(var(--background-tertiary))",
          hover: "hsl(var(--background-hover))",
        },
        foreground: "hsl(var(--foreground))",
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: {
          DEFAULT: "hsl(var(--border))",
          subtle: "hsl(var(--border-subtle))",
          strong: "hsl(var(--border-strong))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Text colors
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          tertiary: "hsl(var(--text-tertiary))",
          disabled: "hsl(var(--text-disabled))",
        },

        // Movie theater accent colors
        "warm-red": {
          DEFAULT: "hsl(var(--warm-red))",
          light: "hsl(var(--warm-red-light))",
          dark: "hsl(var(--warm-red-dark))",
          muted: "hsl(var(--warm-red-muted))",
          icon: "hsl(var(--warm-red-icon))",
        },
        "star-yellow": {
          DEFAULT: "hsl(var(--star-yellow))",
          bright: "hsl(var(--star-yellow-bright))",
          muted: "hsl(var(--star-yellow-muted))",
        },

        // Curtain background colors
        curtain: {
          DEFAULT: "hsl(var(--curtain-bg))",
          highlight: "hsl(var(--curtain-highlight))",
          shadow: "hsl(var(--curtain-shadow))",
          text: {
            primary: "hsl(var(--curtain-text-primary))",
            secondary: "hsl(var(--curtain-text-secondary))",
            tertiary: "hsl(var(--curtain-text-tertiary))",
            muted: "hsl(var(--curtain-text-muted))",
          },
        },

        // Rating score colors
        rating: {
          excellent: "hsl(var(--rating-excellent))",
          good: "hsl(var(--rating-good))",
          average: "hsl(var(--rating-average))",
          below: "hsl(var(--rating-below))",
          poor: "hsl(var(--rating-poor))",
        },

        // Functional colors
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        error: "hsl(var(--error))",
        info: "hsl(var(--info))",

        // Chart colors
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        // Design system spacing scale (matches Tailwind defaults but explicit for clarity)
        "1": "0.25rem", // 4px
        "2": "0.5rem", // 8px
        "3": "0.75rem", // 12px
        "4": "1rem", // 16px
        "5": "1.5rem", // 24px
        "6": "2rem", // 32px
        "8": "3rem", // 48px
        "10": "4rem", // 64px
      },
      fontSize: {
        // Design system typography scale
        xs: "0.75rem", // 12px
        sm: "0.875rem", // 14px
        base: "1rem", // 16px
        lg: "1.125rem", // 18px
        xl: "1.25rem", // 20px
        "2xl": "1.5rem", // 24px
        "3xl": "1.875rem", // 30px
        "4xl": "2.25rem", // 36px
        "5xl": "3rem", // 48px
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      lineHeight: {
        tight: "1.25",
        normal: "1.5",
        relaxed: "1.75",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
