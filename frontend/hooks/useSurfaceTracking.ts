// frontend/hooks/useSurfaceTracking.ts
// ROADMAP 4.0 Tier B3 — surface event tracking hook.
//
// Best-effort fire-and-forget telemetry. Batches events on a 2s debounce so
// a scrollthrough doesn't fire 30 separate POSTs. Coalesces duplicate
// impressions on the same (surface, action, recipeId) tuple within a batch.
//
// Telemetry never blocks UX — failures are silently swallowed.

import { useCallback, useEffect, useRef } from 'react';
import { surfaceEventApi, type SurfaceEventInput } from '../lib/api';

const FLUSH_DEBOUNCE_MS = 2000;

export interface SurfaceTracker {
  track: (event: SurfaceEventInput) => void;
  flush: () => void;
}

export function useSurfaceTracking(): SurfaceTracker {
  const pendingRef = useRef<SurfaceEventInput[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const batch = pendingRef.current;
    if (batch.length === 0) return;
    pendingRef.current = [];
    void surfaceEventApi.recordBatch(batch);
  }, []);

  const track = useCallback(
    (event: SurfaceEventInput) => {
      // Coalesce duplicate (surface, action, recipeId) tuples within the
      // pending batch — repeated impressions on the same recipe in one
      // scroll session count once.
      const key = `${event.surface}::${event.action}::${event.recipeId ?? ''}`;
      const seenKeys = new Set(
        pendingRef.current.map(
          (e) => `${e.surface}::${e.action}::${e.recipeId ?? ''}`
        )
      );
      if (!seenKeys.has(key)) {
        pendingRef.current.push(event);
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(flush, FLUSH_DEBOUNCE_MS);
    },
    [flush]
  );

  // Flush on unmount — don't drop the pending batch.
  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  return { track, flush };
}
