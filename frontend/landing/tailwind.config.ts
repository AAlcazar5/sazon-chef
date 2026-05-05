import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF5EE',
          100: '#FFE4D1',
          200: '#FBC8A4',
          300: '#F4A87C',
          400: '#EE8A60',
          500: '#E8704F',
          600: '#D55735',
          700: '#B84A2A',
          800: '#923A22',
          900: '#6F2C1A',
        },
        pastel: {
          peach: '#FFD9C4',
          sage: '#C8DCC4',
          lavender: '#D6CCEB',
          sky: '#C9DCEB',
          blush: '#F4CDD0',
          golden: '#F5DEA0',
        },
        surface: {
          cream: '#FAF7F4',
          linen: '#F2EDE6',
          ink: '#1A1612',
          smoke: '#2A241F',
        },
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
        soft: '0 4px 24px -8px rgba(232,112,79,0.18)',
        lift: '0 20px 60px -20px rgba(26,22,18,0.35)',
        glow: '0 0 0 4px rgba(232,112,79,0.18)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #E8704F 0%, #D9442B 100%)',
        'screen-warm': 'linear-gradient(180deg, #FAF7F4 0%, #F2EDE6 100%)',
        'hero-veil':
          'linear-gradient(180deg, rgba(26,22,18,0) 40%, rgba(26,22,18,0.65) 100%)',
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
