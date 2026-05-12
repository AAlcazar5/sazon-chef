'use client';

import { useEffect, useState } from 'react';

// SSR-safe hook — defaults to `false` until the client-side effect runs.
// `null` window guards mean Next.js SSR / static gen always renders the
// animated path, then hydration corrects for users who opted out.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);

  return reduced;
}
