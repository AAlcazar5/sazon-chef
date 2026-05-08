// ROADMAP 4.0 IA2.8 — Sazon sheet open-event logging.
//
// Records every Sazon sheet open with the trigger source so we can
// measure whether the IA2 demotion (tab → floating FAB) preserved or
// regressed engagement. The downstream daily roll-up (existing
// recommenderEventDaily pattern) computes opens-per-DAU, broken down by
// source, so we can roll back the FAB if open-rate regresses >25% over
// a 7-day window.

import { recordRecommenderEvent } from './recommender/recommenderEventSchema';

const SURFACE = 'sazon_sheet';

export const SAZON_OPEN_SOURCES = [
  'fab_tap',
  'fab_long_press',
  'history_link',
  'tab',
  'deep_link',
  'recipe_detail_pill',
  'other',
] as const;
export type SazonOpenSource = (typeof SAZON_OPEN_SOURCES)[number];

const SAZON_OPEN_SOURCE_SET: Set<string> = new Set(SAZON_OPEN_SOURCES);

// Free-text keys must NEVER reach the log. PII guard inherited from
// the unified telemetry contract (N1.3) — duplicated here as defense
// in depth.
const PII_BLOCKED_KEYS = [
  'note',
  'notes',
  'message',
  'comment',
  'searchQuery',
  'cravingQuery',
  'freeText',
];

export interface LogSazonOpenInput {
  userId: string;
  source: SazonOpenSource;
  /** Optional pre-fill seed the user opened the sheet with. */
  contextSeed?: string;
  /** Optional resolved locale at open-time. */
  locale?: string;
  /** Caller-supplied structured metadata (PII-blocked keys stripped). */
  extra?: Record<string, unknown>;
}

function stripPII(extra: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!extra) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (PII_BLOCKED_KEYS.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

export async function logSazonOpen(input: LogSazonOpenInput): Promise<void> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  if (!SAZON_OPEN_SOURCE_SET.has(input.source)) {
    throw new Error(`unknown source: ${input.source}`);
  }

  const metadata: Record<string, unknown> = {
    source: input.source,
    ...stripPII(input.extra),
  };
  if (input.contextSeed) metadata.contextSeed = input.contextSeed;
  if (input.locale) metadata.locale = input.locale;

  await recordRecommenderEvent({
    userId: input.userId,
    surface: SURFACE,
    eventType: 'open',
    metadata,
  });
}

export const __forTest = {
  SURFACE,
  PII_BLOCKED_KEYS,
};
