'use client';

// One-shot chef-kiss Lottie for the Waitlist success state.
// Lazy-loaded so `lottie-react` (~50KB+) doesn't ship in the initial bundle.
// Respects `prefers-reduced-motion` by falling back to the static SVG.

import dynamic from 'next/dynamic';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import chefKissData from '@/public/lottie/chef-kiss.json';

// Lazy chunk — keeps lottie-react out of the entry bundle.
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => <StaticMascot />,
});

function StaticMascot() {
  return (
    <img
      src="/mascot/sazon-logo.svg"
      alt="Sazon mascot welcoming you"
      className="h-16 w-16"
      data-testid="waitlist-success-mascot-static"
    />
  );
}

export function WaitlistSuccessMascot() {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <StaticMascot />;
  }

  return (
    <div
      className="h-16 w-16"
      data-testid="waitlist-success-mascot-lottie"
      aria-label="Sazon mascot welcoming you"
      role="img"
    >
      <Lottie animationData={chefKissData} loop={false} autoplay />
    </div>
  );
}
