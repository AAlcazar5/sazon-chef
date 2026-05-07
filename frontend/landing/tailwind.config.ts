import type { Config } from 'tailwindcss';

// DS9.1 — landing tailwind consumes the shared color source from the app
// at frontend/constants/colorTokens.cjs. Single source of truth for brand
// across the waitlist→app journey. See docs/design-decisions/DS9-landing-parity.md.
//
// The CommonJS import is intentional — Tailwind configs are evaluated by
// Node, and the shared module is .cjs so it works in both the RN/Tailwind
// build (frontend/) and the Next.js build (frontend/landing/).
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
const t = require('../constants/colorTokens.cjs');

// Generate a 50-900 numerical scale from the canonical Brand.light.base so
// existing landing utilities (brand-600 / brand-700 / etc.) keep working.
// Light end is mixed toward white; dark end toward Brand.light.deep.
function mix(hexA: string, hexB: string, t: number): string {
  const a = hexA.replace('#', '');
  const b = hexB.replace('#', '');
  const ar = parseInt(a.slice(0, 2), 16);
  const ag = parseInt(a.slice(2, 4), 16);
  const ab = parseInt(a.slice(4, 6), 16);
  const br = parseInt(b.slice(0, 2), 16);
  const bg = parseInt(b.slice(2, 4), 16);
  const bb = parseInt(b.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bch = Math.round(ab + (bb - ab) * t);
  return '#' + [r, g, bch].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
const base = t.Brand.light.base;
const deep = t.Brand.light.deep;
const brandScale = {
  '50': mix('#FFFFFF', base, 0.05),
  '100': mix('#FFFFFF', base, 0.18),
  '200': mix('#FFFFFF', base, 0.36),
  '300': mix('#FFFFFF', base, 0.55),
  '400': mix('#FFFFFF', base, 0.78),
  '500': base,
  '600': mix(base, deep, 0.45),
  '700': mix(base, deep, 0.78),
  '800': mix(deep, '#000000', 0.18),
  '900': mix(deep, '#000000', 0.42),
};

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Landing keeps the 50-900 numerical brand scale for backwards-compat;
        // brand-500 is now the canonical Brand.light.base (DS9.1).
        brand: brandScale,

        // Pastel — sourced from frontend PastelTokens.light. Names mirror
        // the frontend's namespace 1:1.
        pastel: {
          peach: t.PastelTokens.light.peach,
          sage: t.PastelTokens.light.sage,
          lavender: t.PastelTokens.light.lavender,
          sky: t.PastelTokens.light.sky,
          blush: t.PastelTokens.light.blush,
          golden: t.PastelTokens.light.golden,
        },

        // Surface — landing's `cream` and `linen` map onto Canvas.warmLight
        // (Today's editorial canvas, DS2.2). `ink` and `smoke` map to ink
        // tokens for legibility.
        surface: {
          cream: t.Canvas.warmLight,
          linen: '#F2EDE6', // landing-specific tint, not used in app
          ink: t.Ink.light.warm,
          smoke: '#2A241F', // landing-specific darker scaffold
        },

        // Accent — kept landing-specific (paprika / basil / saffron) since
        // they don't have a 1:1 in the app. Marketing surfaces only.
        accent: {
          paprika: '#D9442B',
          basil: '#5B8A4A',
          saffron: '#E8A537',
        },
      },
      borderRadius: {
        card: '20px',
        sheet: '28px',
        modal: '24px',
        pill: '100px',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: `0 4px 24px -8px rgba(${parseInt(base.slice(1, 3), 16)},${parseInt(base.slice(3, 5), 16)},${parseInt(base.slice(5, 7), 16)},0.18)`,
        lift: '0 20px 60px -20px rgba(26,22,18,0.35)',
        glow: `0 0 0 4px rgba(${parseInt(base.slice(1, 3), 16)},${parseInt(base.slice(3, 5), 16)},${parseInt(base.slice(5, 7), 16)},0.18)`,
      },
      backgroundImage: {
        'brand-gradient': `linear-gradient(135deg, ${base} 0%, ${deep} 100%)`,
        'screen-warm': `linear-gradient(180deg, ${t.Canvas.warmLight} 0%, #F2EDE6 100%)`,
        'hero-veil': 'linear-gradient(180deg, rgba(26,22,18,0) 40%, rgba(26,22,18,0.65) 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(-4px)' },
          '50%': { transform: 'translateY(4px)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
