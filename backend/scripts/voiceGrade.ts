// backend/scripts/voiceGrade.ts
// Tier U voice-grade pass — pure helpers (no I/O, fully unit-tested).
//
// Grading rubric is the canonical brand-voice scale
// (.claude/context/guards/brand-voice.md §"Voice grading scale"):
//
//   5  Bon Appétit / Ottolenghi       ✅ ship
//   4  Sazon — friendly, informed     ✅ ship
//   3  Generic but fine               🟡 rewrite
//   2  Macro-cult / coachy            ❌ rewrite
//   1  "Healthy low-cal protein blast" ❌ discard
//
// → ship ≥ 4 · discard < 2 · rewrite is the [2, 4) middle band.

export const SHIP_MIN = 4;
export const DISCARD_BELOW = 2; // score < DISCARD_BELOW → discard

// Tier U launch roster — top-20 cuisines (ROADMAP_TO_LAUNCH.md §Tier U).
export const MVP_CUISINES: readonly string[] = [
  'Italian',
  'Mexican',
  'Japanese',
  'Thai',
  'Indian',
  'Chinese',
  'French',
  'Spanish',
  'Greek',
  'Turkish',
  'Lebanese',
  'Korean',
  'Vietnamese',
  'Moroccan',
  'Persian',
  'Peruvian',
  'Brazilian',
  'Ethiopian',
  'American Southern',
  'Cajun',
];

export type GradeBucket = 'ship' | 'rewrite' | 'discard';

export interface ScoredRecipe {
  cuisine: string;
  score: number;
}

export interface CuisineRollup {
  cuisine: string;
  total: number;
  ship: number;
  rewrite: number;
  discard: number;
  shipPct: number;
}

export interface VoiceGradeSummary {
  total: number;
  ship: number;
  rewrite: number;
  discard: number;
  shipPct: number;
  byCuisine: CuisineRollup[];
}

export function bucketGrade(score: number): GradeBucket {
  if (score >= SHIP_MIN) return 'ship';
  if (score < DISCARD_BELOW) return 'discard';
  return 'rewrite';
}

function pct(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function summarize(rows: readonly ScoredRecipe[]): VoiceGradeSummary {
  const blank = (): { ship: number; rewrite: number; discard: number } => ({
    ship: 0,
    rewrite: 0,
    discard: 0,
  });

  const overall = blank();
  const perCuisine = new Map<string, ReturnType<typeof blank>>();

  for (const row of rows) {
    const bucket = bucketGrade(row.score);
    overall[bucket] += 1;
    const c = perCuisine.get(row.cuisine) ?? blank();
    c[bucket] += 1;
    perCuisine.set(row.cuisine, c);
  }

  const total = rows.length;
  const byCuisine: CuisineRollup[] = [...perCuisine.entries()]
    .map(([cuisine, c]) => {
      const cTotal = c.ship + c.rewrite + c.discard;
      return {
        cuisine,
        total: cTotal,
        ship: c.ship,
        rewrite: c.rewrite,
        discard: c.discard,
        shipPct: pct(c.ship, cTotal),
      };
    })
    .sort((a, b) => a.cuisine.localeCompare(b.cuisine));

  return {
    total,
    ship: overall.ship,
    rewrite: overall.rewrite,
    discard: overall.discard,
    shipPct: pct(overall.ship, total),
    byCuisine,
  };
}

function bar(p: number): string {
  const filled = Math.round((p / 100) * 20);
  return '█'.repeat(filled) + '░'.repeat(20 - filled);
}

export function formatReport(summary: VoiceGradeSummary): string {
  const lines: string[] = [];
  lines.push('Tier U — Voice Grade (≥4 ship · [2,4) rewrite · <2 discard)');
  lines.push('━'.repeat(62));
  lines.push(
    `Overall  ${bar(summary.shipPct)}  ${summary.shipPct}% ship ` +
      `(${summary.ship}/${summary.total})  ` +
      `rewrite ${summary.rewrite}  discard ${summary.discard}`,
  );
  lines.push('');
  for (const c of summary.byCuisine) {
    lines.push(
      `${c.cuisine.padEnd(18)} ${bar(c.shipPct)} ${String(c.shipPct).padStart(5)}% ` +
        `ship ${String(c.ship).padStart(4)}  rw ${String(c.rewrite).padStart(4)}  ` +
        `dc ${String(c.discard).padStart(4)}  (${c.total})`,
    );
  }
  return lines.join('\n');
}
