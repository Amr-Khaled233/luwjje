import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

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
      screens: {
        // Small phones (iPhone SE, 360px Androids) need their own step —
        // between them and `sm` is where single-column layouts start to work.
        xs: '400px',
      },
      // Every colour is a CSS variable holding an "R G B" triplet, so the same
      // token resolves light on the dashboard (:root) and dark on the
      // storefront (.theme-dark) — see globals.css. `rgb(var / <alpha-value>)`
      // keeps the /opacity utilities (bg-background/60) working.
      colors: {
        background: 'rgb(var(--c-background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          lowest: 'rgb(var(--c-surface-lowest) / <alpha-value>)',
          low: 'rgb(var(--c-surface-low) / <alpha-value>)',
          container: 'rgb(var(--c-surface-container) / <alpha-value>)',
          bright: 'rgb(var(--c-surface-bright) / <alpha-value>)',
        },
        'on-background': 'rgb(var(--c-on-surface) / <alpha-value>)',
        'on-surface': 'rgb(var(--c-on-surface) / <alpha-value>)',
        navy: {
          DEFAULT: 'rgb(var(--c-navy) / <alpha-value>)',
          soft: 'rgb(var(--c-navy-soft) / <alpha-value>)',
        },
        secondary: 'rgb(var(--c-secondary) / <alpha-value>)',
        tertiary: 'rgb(var(--c-tertiary) / <alpha-value>)',
        outline: {
          DEFAULT: 'rgb(var(--c-outline) / <alpha-value>)',
          soft: 'rgb(var(--c-outline-soft) / <alpha-value>)',
          variant: 'rgb(var(--c-outline-variant) / <alpha-value>)',
        },
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        error: 'rgb(var(--c-error) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        'warning-ink': 'rgb(var(--c-warning-ink) / <alpha-value>)',
        'inverse-surface': 'rgb(var(--c-inverse-surface) / <alpha-value>)',
      },
      fontFamily: {
        // --font-heading / --font-body are swapped per locale in globals.css,
        // so every existing `font-display` / `font-sans` follows the language.
        display: ['var(--font-heading)', 'var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        latin: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
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
      gridTemplateColumns: {
        // The product editor's colourway row needs one more column than 12.
        14: 'repeat(14, minmax(0, 1fr))',
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
      /**
       * Motion vocabulary. Short, eased with `scandi`, and never bouncy —
       * movement should feel like paper settling, not a spring. Every one of
       * these is disabled wholesale under `prefers-reduced-motion` in
       * globals.css, so nothing here needs its own guard.
       *
       * Drawers slide along the inline axis via `--slide-from`, which the RTL
       * rule in globals.css flips, so one keyframe serves both directions.
       */
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(var(--slide-from, 100%))' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.98) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        // Panel that grows out of nothing — used by accordions and filter drawers.
        'expand-down': {
          from: { opacity: '0', maxHeight: '0' },
          to: { opacity: '1', maxHeight: '1200px' },
        },
        // Loading placeholder sweep. Distance is set by the element's width.
        shimmer: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        // The 1px rule that draws itself under a section heading.
        'draw-rule': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-out': 'fade-out 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up': 'fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-down': 'fade-down 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in': 'slide-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'expand-down': 'expand-down 300ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'draw-rule': 'draw-rule 500ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [
    // `hoverable:` guards an effect behind a real hovering pointer, so a
    // touch phone or tablet — where `:hover` sticks after a tap — never
    // triggers it. Stack it before a hover variant: `hoverable:group-hover:…`.
    plugin(({ addVariant }) => {
      addVariant('hoverable', '@media (hover: hover)');
    }),
  ],
};

export default config;
