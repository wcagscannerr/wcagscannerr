import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        'surface-elevated': 'hsl(var(--surface-elevated) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        'border-light': 'hsl(var(--border-light) / <alpha-value>)',
        'text-primary': 'hsl(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'hsl(var(--text-secondary) / <alpha-value>)',
        'text-muted': 'hsl(var(--text-muted) / <alpha-value>)',
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          hover: 'hsl(var(--accent-hover) / <alpha-value>)',
          glow: 'hsl(var(--glow-primary))',
          'glow-strong': 'hsl(var(--accent-glow-strong))',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          glow: 'hsl(var(--glow-success))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          glow: 'hsl(var(--glow-warning))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          glow: 'hsl(var(--glow-danger))',
        },
        severity: {
          critical: 'hsl(var(--critical) / <alpha-value>)',
          serious: 'hsl(var(--serious) / <alpha-value>)',
          moderate: 'hsl(var(--moderate) / <alpha-value>)',
          minor: 'hsl(var(--minor) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-xl)',
        '3xl': 'var(--radius-xl)',
        // rounded-full is deliberately NOT overridden here - it's used
        // for circles/avatars/pill buttons/status dots, a different job
        // than "how sharp are my card corners." Zeroing it out would turn
        // circular elements into squares, which usually isn't what's
        // wanted even when the goal is sharp-cornered cards and buttons.
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
        'glow-strong': 'var(--shadow-glow-strong)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeInUp 0.6s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px hsl(var(--glow-primary))' },
          '50%': { boxShadow: '0 0 30px hsl(var(--accent-glow-strong))' },
        },
      },
    },
  },
  plugins: [],
};

export default config;