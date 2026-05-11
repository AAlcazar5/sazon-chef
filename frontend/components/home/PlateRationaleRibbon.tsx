// frontend/components/home/PlateRationaleRibbon.tsx
// ROADMAP 4.0 BAP0.2 — "Why these slots" rationale ribbon for Today's plate hero.
//
// Mirrors HX0.2's HeroRationaleRibbon visual + interaction model — italic
// compact line under the hero, taps expand a half-sheet of secondaries.
// Only the signal payload is plate-specific (pantry coverage / cuisine
// cadence / leftover continuity / macro fit).
//
// Lifestyle voice contract: ≤90 chars primary, ≤3 secondaries, banned
// vocabulary scrubbed (no "macro-friendly", "cut/bulk/maintain", "score",
// "ranked"). plateRationaleBuilder enforces.

import React from 'react';
import HeroRationaleRibbon, {
  type HeroRationale,
} from './HeroRationaleRibbon';

/** Payload built by `plateRationaleBuilder` server-side. */
export interface PlateRationale {
  primaryReason: string;
  secondaryReasons: string[];
}

interface PlateRationaleRibbonProps {
  rationale: PlateRationale | null | undefined;
}

const PLATE_RATIONALE_TESTID = 'plate-rationale-ribbon';

export default function PlateRationaleRibbon({ rationale }: PlateRationaleRibbonProps) {
  // Adapt the plate payload to HeroRationale shape — same visual contract.
  const adapted: HeroRationale | null = rationale
    ? {
        primaryReason: rationale.primaryReason,
        secondaryReasons: rationale.secondaryReasons,
      }
    : null;

  if (!adapted || !adapted.primaryReason) return null;

  return (
    <HeroRationaleRibbon
      rationale={adapted}
      // The plate ribbon doesn't carry a once-per-session peek hint — the
      // hero CTA itself is the primary attractor, the ribbon is supporting.
    />
  );
}

export { PLATE_RATIONALE_TESTID };
