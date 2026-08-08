import type { Config } from 'tailwindcss';

/**
 * luwjje — Scandinavian Minimalism design tokens.
 * Sharp corners (radius 0), no shadows, depth from 1px outlines + surface contrast.
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Sharp edges everywhere. `rounded-*` is intentionally crippled.
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      sm: '1px', // checkboxes / toggles only
      full: '9999px', // colour swatches & avatars only
    },
    boxShadow: {
      none: 'none',
      DEFAULT: 'none',
    },
    extend: {
      colors: {
        background: '#f8f9ff',
        surface: {
          DEFAULT: '#f8f9ff',
          lowest: '#ffffff',
          low: '#eff4ff',
          container: '#e5eeff',
          bright: '#f8f9ff',
        },
        'on-background': '#0b1c30',
        'on-surface': '#0b1c30',
        navy: {
          DEFAULT: '#0b1c30',
          soft: '#213145',
        },
        secondary: '#565e74',
        tertiary: '#747879',
        outline: {
          DEFAULT: '#595f66',
          soft: '#747879',
          variant: '#c4c7c9',
        },
        primary: '#5b5f61',
        error: '#ba1a1a',
        'inverse-surface': '#213145',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['64px', { lineHeight: '72px', letterSpacing: '-0.02em' }],
        'display-md': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em' }],
        'display-sm': ['40px', { lineHeight: '48px', letterSpacing: '-0.01em' }],
        'headline-lg': ['40px', { lineHeight: '48px' }],
        'headline-md': ['32px', { lineHeight: '40px' }],
        'headline-sm': ['24px', { lineHeight: '32px' }],
        'title-md': ['20px', { lineHeight: '28px' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'label-md': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.1em', fontWeight: '600' }],
      },
      spacing: {
        gutter: '32px',
        'margin-desktop': '64px',
        'margin-mobile': '20px',
        'stack-sm': '16px',
        'stack-md': '40px',
        'stack-lg': '80px',
      },
      maxWidth: {
        container: '1440px',
      },
      backdropBlur: {
        overlay: '20px',
      },
      transitionTimingFunction: {
        scandi: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up': 'fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
