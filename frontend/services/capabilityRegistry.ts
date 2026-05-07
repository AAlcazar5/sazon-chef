// frontend/services/capabilityRegistry.ts
// ROADMAP 4.0 N6.2 — Capability registry.
//
// Each new HX/IG/WK/N surface that introduces a NEW user-visible behavior
// registers `{ featureKey, priority, copyShort, copyLong }`. The reveal
// coordinator (N6.1) picks the next-priority unrevealed feature and
// surfaces a one-time tooltip + chef-kiss sparkle when the user first
// reaches the surface.
//
// Single source of truth for "what's new for this user." AsyncStorage-
// backed: `featureRevealedAt: ISO date` per featureKey persists across
// sessions, so a feature reveal fires exactly once per user-feature pair.
//
// Per-session cap: only one reveal can fire per session — the coordinator
// tracks an in-memory `revealedThisSessionCount` so a user opening Today
// for the first time doesn't get carpet-bombed with sparkles.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@sazon/capability_registry/revealed/';
export const MAX_REVEALS_PER_SESSION = 1;

export interface CapabilityRegistration {
  /** Stable identifier — never reused across feature renames. */
  featureKey: string;
  /** Higher = more likely to win the reveal slot when multiple unlock. */
  priority: number;
  /** Short banner-style copy (≤ 32 chars). */
  copyShort: string;
  /** Long sheet-style copy (≤ 200 chars). */
  copyLong: string;
}

interface RegistryState {
  registrations: Map<string, CapabilityRegistration>;
  revealedThisSessionCount: number;
}

const state: RegistryState = {
  registrations: new Map(),
  revealedThisSessionCount: 0,
};

function storageKey(featureKey: string): string {
  return `${STORAGE_PREFIX}${featureKey}`;
}

/**
 * Register a capability at boot time. Idempotent — re-registering the same
 * featureKey replaces the prior entry (last write wins).
 */
export function registerCapability(input: CapabilityRegistration): void {
  if (!input.featureKey) {
    throw new Error('registerCapability: featureKey required');
  }
  if (input.copyShort.length > 32) {
    throw new Error(
      `registerCapability: copyShort must be ≤ 32 chars (got ${input.copyShort.length})`,
    );
  }
  if (input.copyLong.length > 200) {
    throw new Error(
      `registerCapability: copyLong must be ≤ 200 chars (got ${input.copyLong.length})`,
    );
  }
  state.registrations.set(input.featureKey, input);
}

/** Read the persisted reveal timestamp for a feature, or null. */
export async function getRevealedAt(
  featureKey: string,
): Promise<Date | null> {
  if (!featureKey) return null;
  try {
    const stored = await AsyncStorage.getItem(storageKey(featureKey));
    if (!stored) return null;
    const d = new Date(stored);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** True iff this feature has been revealed before (any time). */
export async function isRevealed(featureKey: string): Promise<boolean> {
  return (await getRevealedAt(featureKey)) != null;
}

/**
 * Persist the reveal timestamp — caller invokes after the animation plays.
 * Note: the per-session counter is incremented at pick time (synchronously,
 * inside `pickNextReveal`), not here. So calling markRevealed without a
 * prior pickNextReveal does NOT count toward the cap.
 */
export async function markRevealed(
  featureKey: string,
  now: Date = new Date(),
): Promise<void> {
  if (!featureKey) return;
  try {
    await AsyncStorage.setItem(storageKey(featureKey), now.toISOString());
  } catch {
    // best-effort; reveal still appears once during this session
  }
}

/**
 * Pick the next capability the user hasn't seen, capped at one per session.
 * Returns null when:
 *   - no registered features remain unrevealed, OR
 *   - the per-session cap (MAX_REVEALS_PER_SESSION) is exhausted
 *
 * `featureKey` arg narrows the search to a specific feature — useful when
 * a surface only wants to fire its OWN reveal (most common case). Omit to
 * scan all registered features and return the highest-priority unrevealed
 * one (used by the coordinator pattern when multiple features unlock at once).
 */
export async function pickNextReveal(
  featureKey?: string,
): Promise<CapabilityRegistration | null> {
  if (state.revealedThisSessionCount >= MAX_REVEALS_PER_SESSION) return null;

  let result: CapabilityRegistration | null = null;

  if (featureKey) {
    const reg = state.registrations.get(featureKey);
    if (reg && !(await isRevealed(featureKey))) {
      result = reg;
    }
  } else {
    // Scan all registered, find unrevealed, pick highest priority (ties → key
    // alphabetical for deterministic ordering).
    const candidates: CapabilityRegistration[] = [];
    for (const reg of state.registrations.values()) {
      // Sequentially await — each AsyncStorage hit is fast; avoids parallelism
      // for predictable test ordering.
      // eslint-disable-next-line no-await-in-loop
      if (!(await isRevealed(reg.featureKey))) candidates.push(reg);
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.featureKey.localeCompare(b.featureKey);
      });
      result = candidates[0];
    }
  }

  // Re-check the cap after the await — another concurrent call may have
  // claimed the slot in between. Synchronous increment makes the claim
  // race-free for siblings that resolved at slightly different times.
  if (result == null) return null;
  if (state.revealedThisSessionCount >= MAX_REVEALS_PER_SESSION) return null;
  state.revealedThisSessionCount += 1;
  return result;
}

// ── Test helpers ────────────────────────────────────────────────────────────

/** Reset registry + session counter between tests. */
export function __resetRegistryForTests(): void {
  state.registrations.clear();
  state.revealedThisSessionCount = 0;
}

/** Inspect state for assertions. */
export const __INTERNALS = {
  getSessionRevealCount: () => state.revealedThisSessionCount,
  getRegisteredKeys: () => [...state.registrations.keys()],
  STORAGE_PREFIX,
};
