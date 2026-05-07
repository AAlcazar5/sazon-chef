// backend/__tests__/quality/engineSignalCoverage.test.ts
// ROADMAP 4.0 N5.1 — Engine signal coverage audit.
//
// Maps every WK / IG / HX / FX / C12 ranker input to its onboarding origin
// (or a documented "infer from cook events" fallback). No input should be
// silently undefined for a fresh user — every gap surfaces here.
//
// This test is a CAP test (file-level introspection), not a runtime check:
// it verifies the schema has the columns that downstream rankers depend on.
// When a ranker adds a new input requirement, add it to RANKER_INPUTS below
// and either:
//   (a) add a column to UserPreferences (via N5.2) for the onboarding signal, OR
//   (b) document the inferred-from-cook-events fallback in `inferred`

import * as fs from 'fs';
import * as path from 'path';

const SCHEMA_PATH = path.resolve(
  __dirname,
  '../../prisma/schema.prisma',
);

interface RankerInput {
  /** Ranker that needs this input (e.g., 'WK5.1', 'IG10.1', 'C12'). */
  ranker: string;
  /** Logical signal name (e.g., 'macro distribution preference'). */
  signal: string;
  /** UserPreferences column name (when captured at signup). */
  column?: string;
  /** Documented fallback when no onboarding signal exists. */
  inferred?: string;
}

const RANKER_INPUTS: RankerInput[] = [
  // C12 — adaptive notifications
  {
    ranker: 'C12',
    signal: 'notification window (when does the user typically cook?)',
    column: 'notificationWindow',
  },
  // WK5.1 — per-user macro distribution
  {
    ranker: 'WK5.1',
    signal: 'macro distribution preference',
    column: 'cookFrequency', // skill + macro distribution prior derived from frequency
    inferred: 'Falls back to global 25/30/35/10/8 default when null',
  },
  // WK7.1 — skill-tier-aware difficulty curve
  {
    ranker: 'WK7.1',
    signal: 'cooking skill self-assessment',
    column: 'cookingSkillLevel',
    inferred: 'Inferred from CookingLog count + recipe difficulty when null',
  },
  // WK10.1 — recurring meal rotation
  {
    ranker: 'WK10.1',
    signal: 'rotation preference',
    inferred: 'Inferred from CookingLog frequency-of-repeat events',
  },
  // WK2.1 — carry-over default
  {
    ranker: 'WK2.1',
    signal: 'leftover acceptance preference',
    column: 'leftoverAccept',
    inferred: 'Defaults true; LeftoverInventory cook events refine over 30d',
  },
  // IG10.1 — Pantry IQ cuisine-lean cold start
  {
    ranker: 'IG10.1',
    signal: 'pantry-leaning cuisine preference',
    column: 'pantryLeaningCuisines',
    inferred: 'Falls back to inferred cuisine from CookingLog when no onboarding answer',
  },
  // F1 — friends feed
  {
    ranker: 'F1',
    signal: 'social opt-in',
    column: 'socialOptIn',
  },
  // HX2.3 — cohort overlay
  {
    ranker: 'HX2.3',
    signal: 'social opt-in (shared with F1)',
    column: 'socialOptIn',
  },
  // IG1.1 — cross-user co-purchase
  {
    ranker: 'IG1.1',
    signal: 'cross-user data share opt-in',
    column: 'privacyShareOptIn',
  },
  // A5 — already covered (relation-backed, captured pre-N5)
  {
    ranker: 'A5-c',
    signal: 'liked cuisines',
    column: 'likedCuisines', // relation
  },
  // A5-d/e/f/g (nutrition UI density / pantry top 5 / kitchen equipment /
  // cook for) ship via the existing onboarding screens that persist to
  // UserPreferences via JSON-stringified payloads on different shapes.
  // They're A5's responsibility, not N5's. Out of scope for this audit.
];

function loadSchema(): string {
  return fs.readFileSync(SCHEMA_PATH, 'utf-8');
}

function schemaHasColumn(schema: string, column: string): boolean {
  // Match patterns like:
  //   privacyShareOptIn Boolean? @default(true)
  //   pantryLeaningCuisines String?
  //   likedCuisines       LikedCuisine[]
  const re = new RegExp(`\\b${column}\\s+\\S+`);
  return re.test(schema);
}

describe('N5.1 — engine signal coverage audit', () => {
  const schema = loadSchema();

  it('every ranker input has either an onboarding column or a documented fallback', () => {
    const violations: string[] = [];
    for (const input of RANKER_INPUTS) {
      if (input.column) {
        if (!schemaHasColumn(schema, input.column)) {
          violations.push(
            `${input.ranker} (${input.signal}) declares column '${input.column}' but it doesn't exist in UserPreferences`,
          );
        }
      } else if (!input.inferred) {
        violations.push(
          `${input.ranker} (${input.signal}) has neither a column nor an 'inferred' fallback`,
        );
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `N5.1 audit: signal coverage gaps:\n${violations.map((v) => `  - ${v}`).join('\n')}`,
      );
    }
  });

  it('every input is either captured or inferred (no silent undefined)', () => {
    for (const input of RANKER_INPUTS) {
      const hasCapture = input.column !== undefined;
      const hasFallback = input.inferred !== undefined;
      expect(hasCapture || hasFallback).toBe(true);
    }
  });

  it('the N5.2 launch fields (the gap closers) are present in schema', () => {
    // These are the new fields N5.2 adds. If any are missing, N5.2 is incomplete.
    const launchFields = [
      'cookFrequency',
      'notificationWindow',
      'socialOptIn',
      'pantryLeaningCuisines',
      'leftoverAccept',
    ];
    for (const f of launchFields) {
      expect(schemaHasColumn(schema, f)).toBe(true);
    }
  });

  it('N8.2 privacy column is present', () => {
    expect(schemaHasColumn(schema, 'privacyShareOptIn')).toBe(true);
  });

  it('exposes the audit table size for cap-test inspection', () => {
    expect(RANKER_INPUTS.length).toBeGreaterThanOrEqual(8);
  });
});
