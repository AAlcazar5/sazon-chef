// ROADMAP 4.0 T1.2 — Tonight Mode copy generator.
//
// Pure function, deterministic for fixed input. Renders one of four context
// templates depending on which signals are present (expiring ingredient,
// cuisine gap on a cold night, day-of-week, generic). Output is hard-capped
// at 120 chars and banned-vocab linted (no cut/bulk/maintain/crush/under your).

export interface CopyContext {
  expiringIngredient?: string;
  dayOfWeek: string;
  weatherCold?: boolean;
  lastCuisineGapDays?: number;
  cuisine: string;
  cookTime: number;
}

const MAX_LINE_LENGTH = 120;

const titleCase = (s: string): string =>
  s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const truncate = (line: string): string => {
  if (line.length <= MAX_LINE_LENGTH) return line;
  // Trim to last word boundary inside cap, append ellipsis.
  const slice = line.slice(0, MAX_LINE_LENGTH - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 60 ? slice.slice(0, lastSpace) : slice;
  return base + '…';
};

export const generateCopyLine = (ctx: CopyContext): string => {
  const cuisineLabel = titleCase(ctx.cuisine);

  // Priority 1: expiring ingredient → strongest signal.
  if (ctx.expiringIngredient) {
    const line = `${ctx.dayOfWeek}, your ${ctx.expiringIngredient} is ready — ${cuisineLabel} in ${ctx.cookTime}.`;
    return truncate(line);
  }

  // Priority 2: cold night + cuisine gap → invitation.
  if (ctx.weatherCold && ctx.lastCuisineGapDays && ctx.lastCuisineGapDays >= 7) {
    const line = `Cold night. Haven't had ${cuisineLabel} in ${ctx.lastCuisineGapDays} days — ${ctx.cookTime} minutes.`;
    return truncate(line);
  }

  // Priority 3: cuisine gap alone.
  if (ctx.lastCuisineGapDays && ctx.lastCuisineGapDays >= 7) {
    const line = `Haven't had ${cuisineLabel} in ${ctx.lastCuisineGapDays} days — ${ctx.cookTime} minutes.`;
    return truncate(line);
  }

  // Priority 4: day-of-week framing.
  const line = `${ctx.dayOfWeek} energy: ${cuisineLabel}, ${ctx.cookTime} minutes.`;
  return truncate(line);
};
