// backend/src/services/coachMemoryWriteback.ts
// ROADMAP 4.0 Tier C5 — Sazon memory writeback to structured stack.
//
// `coachMemoryService` already extracts free-text memories from conversations.
// This service maps a memory's content to STRUCTURED side-effects on the
// personalization stack:
//   - cuisine variety target → adjacency exploration coefficient
//   - satiety pattern → protein/fiber prompt addendum nudge
//   - goal adjustment → UserPreferences.goalPhase + macro target deltas
//
// Pure intent detection is in `detectStructuredIntents`. Side-effect
// application lives in `applyStructuredIntents` so callers can dry-run.

import { prisma } from '../lib/prisma';

export type StructuredIntent =
  | { kind: 'cuisine-variety-boost' }
  | { kind: 'protein-target-nudge' }
  | { kind: 'fiber-target-nudge' }
  | { kind: 'goal-phase-change'; newPhase: 'cut' | 'maintain' | 'bulk' | 'recomp' };

const VARIETY_PATTERNS: RegExp[] = [
  /more variety/i,
  /trying new cuisines?/i,
  /try new cuisines?/i,
  /stop suggesting/i,
  /tired of (the )?same/i,
];

const HUNGER_PATTERNS: RegExp[] = [
  /always hungry/i,
  /still hungry/i,
  /hungry by \d+/i,
  /hungry after/i,
];

const FULLNESS_PATTERNS: RegExp[] = [
  /feel full longer/i,
  /stay full/i,
  /more fiber/i,
];

const GOAL_PATTERNS: Array<{ rx: RegExp; phase: 'cut' | 'maintain' | 'bulk' | 'recomp' }> = [
  { rx: /switching to maintenance|going to maintenance|now on maintenance/i, phase: 'maintain' },
  { rx: /starting a cut|going to cut|cutting cycle|on a cut/i, phase: 'cut' },
  { rx: /lean bulk|going to bulk|starting a bulk/i, phase: 'bulk' },
  { rx: /recomp/i, phase: 'recomp' },
];

export function detectStructuredIntents(content: unknown): StructuredIntent[] {
  if (typeof content !== 'string' || content.length === 0) return [];
  const intents: StructuredIntent[] = [];
  const seen = new Set<string>();

  const push = (intent: StructuredIntent) => {
    const key = JSON.stringify(intent);
    if (seen.has(key)) return;
    seen.add(key);
    intents.push(intent);
  };

  if (VARIETY_PATTERNS.some((rx) => rx.test(content))) {
    push({ kind: 'cuisine-variety-boost' });
  }
  if (HUNGER_PATTERNS.some((rx) => rx.test(content))) {
    push({ kind: 'protein-target-nudge' });
  }
  if (FULLNESS_PATTERNS.some((rx) => rx.test(content))) {
    push({ kind: 'fiber-target-nudge' });
  }
  for (const { rx, phase } of GOAL_PATTERNS) {
    if (rx.test(content)) {
      push({ kind: 'goal-phase-change', newPhase: phase });
      break; // a single utterance only resolves to one goal phase
    }
  }
  return intents;
}

/**
 * Apply detected intents to the structured personalization stack.
 *
 * Notes on schema:
 *   - `cuisine-variety-boost` and the *-target-nudge intents toggle JSON
 *     hint flags inside `UserPreferences`. We use `upsert` because preferences
 *     may not exist yet for new users.
 *   - `goal-phase-change` updates `UserPreferences.goalPhase` directly. Macro
 *     target adjustment is left to a downstream macro-recompute job; we just
 *     declare the new phase here.
 */
export async function applyStructuredIntents(
  userId: string,
  intents: ReadonlyArray<StructuredIntent>
): Promise<void> {
  if (!intents || intents.length === 0) return;

  const flags: Record<string, boolean> = {};
  let goalPhaseUpdate: 'cut' | 'maintain' | 'bulk' | 'recomp' | null = null;

  for (const intent of intents) {
    switch (intent.kind) {
      case 'cuisine-variety-boost':
        flags.cuisineVarietyBoost = true;
        break;
      case 'protein-target-nudge':
        flags.proteinTargetNudge = true;
        break;
      case 'fiber-target-nudge':
        flags.fiberTargetNudge = true;
        break;
      case 'goal-phase-change':
        goalPhaseUpdate = intent.newPhase;
        break;
    }
  }

  if (goalPhaseUpdate !== null) {
    await (prisma as any).userPreferences.update({
      where: { userId },
      data: { goalPhase: goalPhaseUpdate, updatedAt: new Date() },
    });
  }

  if (Object.keys(flags).length > 0) {
    // Encode the boolean nudge flags as a structured-intent JSON column on
    // UserPreferences. Existing schema uses JSON-as-string for similar fields.
    const flagsJson = JSON.stringify(flags);
    await (prisma as any).userPreferences.upsert({
      where: { userId },
      create: { userId, structuredIntents: flagsJson, updatedAt: new Date() },
      update: { structuredIntents: flagsJson, updatedAt: new Date() },
    });
  }
}
