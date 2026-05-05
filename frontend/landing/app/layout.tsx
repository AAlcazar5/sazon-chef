import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://sazonchef.com'),
  title: {
    default: 'Sazon — Eat the world. Live well.',
    template: '%s · Sazon',
  },
  description:
    'The cooking app for people past the spreadsheet. Real food, made for you, from everywhere — with everything you want to know about it.',
  openGraph: {
    title: 'Sazon — Eat the world. Live well.',
    description:
      'The cooking app for people past the spreadsheet. Real food, from everywhere.',
    url: 'https://sazonchef.com',
    siteName: 'Sazon',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sazon — Eat the world. Live well.',
    description:
      'The cooking app for people past the spreadsheet. Real food, from everywhere.',
  },
  icons: {
    icon: '/mascot/sazon-logo.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF7F4',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
