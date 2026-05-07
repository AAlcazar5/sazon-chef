// frontend/tailwind.config.js
//
// Synthesized design tokens — see frontend/design.md for philosophy.
// Lead: Airbnb. Layered: Duolingo (joy), Apple (typography/elevation), Uber (canvas).
// Additive: existing constants/* tokens remain valid.
//
// Color tokens are sourced from constants/colorTokens.cjs — single source of
// truth shared with constants/tokens.ts (DS0.1).

const t = require('./constants/colorTokens.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Canvas (sharp B&W stage) ──────────────────────────────────────
        canvas: {
          DEFAULT: t.Canvas.light,
          dark: t.Canvas.dark,
          warm: t.Canvas.warmLight,
          'warm-dark': t.Canvas.warmDark,
        },
        // ─── Surfaces ──────────────────────────────────────────────────────
        surface: {
          DEFAULT: t.Surface.light.base,
          dark: t.Surface.dark.base,
          tint: t.Surface.light.tint,
          'tint-dark': t.Surface.dark.tint,
          raised: t.Surface.light.raised,
          'raised-dark': t.Surface.dark.raised,
          overlay: t.Surface.light.overlay,
          'overlay-dark': t.Surface.dark.overlay,
        },

        // ─── Brand (single coral accent) ──────────────────────────────────
        brand: {
          DEFAULT: t.Brand.light.base,
          dark: t.Brand.dark.base,
          deep: t.Brand.light.deep,
          'deep-dark': t.Brand.dark.deep,
          soft: t.Brand.light.soft,
          'soft-dark': t.Brand.dark.soft,
          ink: t.Brand.light.ink,
          'ink-dark': t.Brand.dark.ink,
        },

        // ─── Pastel performers (light tints) ───────────────────────────────
        pastel: {
          sage: t.PastelTokens.light.sage,
          golden: t.PastelTokens.light.golden,
          lavender: t.PastelTokens.light.lavender,
          peach: t.PastelTokens.light.peach,
          sky: t.PastelTokens.light.sky,
          blush: t.PastelTokens.light.blush,
          orange: t.PastelTokens.light.orange,
          red: t.PastelTokens.light.red,
        },

        // ─── Pastel accents (vivid for rings, dots, charts) ────────────────
        accent: {
          sage: t.AccentTokens.sage,
          golden: t.AccentTokens.golden,
          lavender: t.AccentTokens.lavender,
          peach: t.AccentTokens.peach,
          sky: t.AccentTokens.sky,
          blush: t.AccentTokens.blush,
        },

        // ─── Ink (text scale) ──────────────────────────────────────────────
        ink: {
          DEFAULT: t.Ink.light.primary,
          primary: t.Ink.light.primary,
          'primary-dark': t.Ink.dark.primary,
          secondary: t.Ink.light.secondary,
          'secondary-dark': t.Ink.dark.secondary,
          tertiary: t.Ink.light.tertiary,
          'tertiary-dark': t.Ink.dark.tertiary,
          inverse: t.Ink.light.inverse,
          'inverse-dark': t.Ink.dark.inverse,
          warm: t.Ink.light.warm,
          'warm-dark': t.Ink.dark.warm,
        },

        // ─── Hairline borders (last resort, never decorative) ──────────────
        hairline: {
          DEFAULT: t.Hairline.light.hairline,
          dark: t.Hairline.dark.hairline,
          soft: t.Hairline.light.soft,
          'soft-dark': t.Hairline.dark.soft,
          strong: t.Hairline.light.strong,
          'strong-dark': t.Hairline.dark.strong,
        },

        // ─── Legacy aliases preserved (pre-DS0 consumers) ──────────────────
        'surface-dark': '#0F0F0F',
        'surface-tint-dark': '#1C1C1E',
        'card-dark': '#1C1C1E',
        'card-raised-dark': '#2C2C2E',
        'card-overlay-dark': '#3A3A3C',
      },

      // ─── Spacing — 4px base, generous Apple/Headspace breathing room ─────
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '30': '120px',
        '36': '144px',
        '48': '192px',
        screen: '20px',
        card: '16px',
        'card-hero': '24px',
        section: '48px',
        hero: '80px',
      },

      maxWidth: {
        content: '1200px',
      },

      // ─── Border radius — Airbnb 20px cards, pill buttons ─────────────────
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        input: '14px',
        lg: '16px',
        card: '20px',
        '2xl': '24px',
        sheet: '28px',
        hero: '36px',
        pill: '9999px',
      },

      // ─── Shadows — Airbnb layered subtle (light) + peak-moment (Duolingo) ─
      boxShadow: {
        xs: '0 0 0 1px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
        sm: '0 0 0 1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04)',
        md: '0 0 0 1px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.06), 0 8px 16px rgba(0,0,0,0.08)',
        lg: '0 0 0 1px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.10)',
        xl: '0 0 0 1px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.12), 0 24px 48px rgba(0,0,0,0.14)',
        // Peak-moment shadow — Duolingo-spirited, only for designed peaks.
        peak: `0 ${t.PeakShadow.depth}px 0 0 ${t.PeakShadow.lightColor}`,
        'peak-deep': `0 6px 0 0 ${t.PeakShadow.lightColor}`,
        // Dark-mode color-shift surrogate (inset glow)
        'inset-glow': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },

      // ─── Typography ────────────────────────────────────────────────────
      fontFamily: {
        display: ['Fraunces', 'Times New Roman', 'serif'],
        body: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Fraunces', 'Times New Roman', 'serif'],
      },

      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
        eyebrow: ['11px', { lineHeight: '1.4', letterSpacing: '1.2px', fontWeight: '800' }],
        caption: ['12px', { lineHeight: '1.4', letterSpacing: '0.3px', fontWeight: '500' }],
        label: ['13px', { lineHeight: '1.35', letterSpacing: '0.2px', fontWeight: '600' }],
        'body-sm': ['14px', { lineHeight: '1.45', letterSpacing: '0px', fontWeight: '400' }],
        body: ['15px', { lineHeight: '1.5', letterSpacing: '0px', fontWeight: '400' }],
        'body-lg': ['17px', { lineHeight: '1.45', letterSpacing: '-0.1px', fontWeight: '400' }],
        title: ['18px', { lineHeight: '1.35', letterSpacing: '-0.1px', fontWeight: '600' }],
        subheading: ['20px', { lineHeight: '1.3', letterSpacing: '-0.2px', fontWeight: '600' }],
        'heading-sm': ['22px', { lineHeight: '1.25', letterSpacing: '-0.3px', fontWeight: '600' }],
        heading: ['26px', { lineHeight: '1.2', letterSpacing: '-0.4px', fontWeight: '600' }],
        'heading-lg': ['32px', { lineHeight: '1.15', letterSpacing: '-0.6px', fontWeight: '700' }],
        'display-md': ['44px', { lineHeight: '1.05', letterSpacing: '-0.9px', fontWeight: '600' }],
        'display-lg': ['56px', { lineHeight: '1.05', letterSpacing: '-1.4px', fontWeight: '700' }],
        display: ['80px', { lineHeight: '1.0', letterSpacing: '-2.4px', fontWeight: '700' }],
        // Stat numbers
        stat: ['24px', { lineHeight: '1.1', letterSpacing: '-0.4px', fontWeight: '700' }],
        'stat-display': ['40px', { lineHeight: '1.0', letterSpacing: '-0.8px', fontWeight: '600' }],
        'stat-hero': ['56px', { lineHeight: '1.0', letterSpacing: '-1.2px', fontWeight: '600' }],
      },

      letterSpacing: {
        'eyebrow': '1.2px',
        'caption': '0.3px',
        'label': '0.2px',
        'body': '0px',
        'tight-1': '-0.1px',
        'tight-2': '-0.2px',
        'tight-3': '-0.3px',
        'tight-4': '-0.4px',
        'tight-6': '-0.6px',
        'tight-9': '-0.9px',
        'tight-14': '-1.4px',
        'tight-24': '-2.4px',
      },

      // ─── Motion ────────────────────────────────────────────────────────
      transitionDuration: {
        instant: '100ms',
        quick: '200ms',
        standard: '300ms',
        modal: '450ms',
        peak: '600ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
}
