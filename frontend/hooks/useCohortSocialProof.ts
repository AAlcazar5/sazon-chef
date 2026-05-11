// frontend/hooks/useCohortSocialProof.ts
// ROADMAP 4.0 F9 — cohort social proof signal.
//
// Pre-HX3.2-migration: CohortSocialProofPill owned this fetch inline
// and returned null when the signal was absent. With HX3.2 lifting the
// pill into DiscoveryStrip, the strip needs to know hasData BEFORE the
// pill renders — otherwise the strip reserves an empty 280-wide card
// slot for a pill that ultimately renders nothing, producing a visible
// gap on cold-start. Hoisting the fetch into this shared hook lets both
// the pill and the strip's hasData computation read from one source.

import { useEffect, useState } from 'react';
import { cohortSocialProofApi, type CohortSocialProofPayload } from '../lib/api';

export interface CohortProofSnapshot {
  cuisine: string;
  copy: string;
}

interface UseCohortSocialProofResult {
  proof: CohortProofSnapshot | null;
  /** True until the first fetch settles. UI should not render the slot
   *  until loading clears + proof is present (avoids an empty-slot flash). */
  loading: boolean;
}

export function useCohortSocialProof(): UseCohortSocialProofResult {
  const [proof, setProof] = useState<CohortProofSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await cohortSocialProofApi.get();
        const payload = (res?.data ?? res) as CohortSocialProofPayload | undefined;
        if (cancelled) return;
        if (payload?.proof) {
          setProof({ cuisine: payload.proof.cuisine, copy: payload.proof.copy });
        }
      } catch {
        // Best-effort — never block Today on a missing signal.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { proof, loading };
}
