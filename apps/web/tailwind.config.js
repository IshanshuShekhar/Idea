/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          foreground: "var(--brand-foreground)",
          soft: "var(--brand-soft)",
        },
        educaro: {
          main: "#000000", // Pure black
          secondary: "#0a0a0a", // Deep graphite
          card: "#121212", // Dark surface
          icon: "#ffffff", // Pure white for icons
          primary: "#ffffff", // Pure white text
          muted: "#888888", // Neutral gray
          accent: "#ffffff", // White buttons/accents
          accentHover: "#e5e5e5", // Off-white hover
          border: "rgba(255, 255, 255, 0.12)", // Subtle white borders
          warning: "var(--warning)",
          warningLight: "oklch(0.96 0.05 85)",
          error: "var(--destructive)",
          errorLight: "oklch(0.96 0.04 25)",
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        'elevated-rest': '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'elevated-hover': '0 12px 32px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
        'elevated-high': '0 16px 48px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.05)',
        'btn': 'var(--shadow-brand)',
        'btn-hover': '0 10px 24px oklch(0.58 0.14 150 / 0.28)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up-1': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards',
        'fade-in-up-2': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards',
        'fade-in-up-3': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
