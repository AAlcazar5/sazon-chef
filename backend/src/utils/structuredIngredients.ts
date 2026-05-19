// Tier Y-1a — persisted structured-ingredient seam.
//
// aiRecipeService emits structured {name, amount, unit}; the recipe-create
// path historically flattened that to a single `text` string, throwing the
// structure away. `buildIngredientRow` keeps BOTH (text for display/back-
// compat + the structured columns), so the Cooking Mode card can rescale
// exactly. `toScalableIngredients` is the read side: prefer persisted
// structure; legacy/text-only rows fall back to the existing
// `parseIngredientQuantity`; unparseable rows are OMITTED, never given a
// fabricated quantity (W-A2 invariant — the model never invents amounts).

import { parseIngredientQuantity } from './ingredientQuantityParser';
import type { ScalableIngredient } from './scaleRecipe';

export interface IngredientRow {
  text: string;
  order: number;
  name?: string;
  amount?: number;
  unit?: string;
}

interface Structuredish {
  text?: unknown;
  name?: unknown;
  amount?: unknown;
  unit?: unknown;
}

export function buildIngredientRow(ing: unknown, index: number): IngredientRow {
  const order = index + 1;

  if (typeof ing === 'string') return { text: ing, order };

  if (ing && typeof ing === 'object') {
    const o = ing as Structuredish;
    if ('text' in o && o.text != null) {
      return { text: String(o.text), order };
    }
    const amountStr = o.amount ? String(o.amount) : '';
    const unit = o.unit ? String(o.unit) : '';
    const name = o.name ? String(o.name) : '';
    const text = `${amountStr}${unit ? ' ' + unit : ''} ${name}`.trim();

    const amountNum = Number(o.amount);
    const hasStructured =
      Number.isFinite(amountNum) && amountNum > 0 && unit.length > 0;
    if (hasStructured) {
      return { text, order, name, amount: amountNum, unit };
    }
    return { text, order };
  }

  return { text: String(ing), order };
}

interface ReadableRow {
  text: string;
  name?: string | null;
  amount?: number | null;
  unit?: string | null;
}

export function toScalableIngredients(
  rows: ReadonlyArray<ReadableRow>,
): ScalableIngredient[] {
  const out: ScalableIngredient[] = [];
  for (const r of rows) {
    const amountNum = r.amount == null ? NaN : Number(r.amount);
    if (Number.isFinite(amountNum) && amountNum > 0 && r.unit) {
      out.push({
        name: r.name && r.name.length > 0 ? r.name : r.text,
        amount: amountNum,
        unit: String(r.unit),
      });
      continue;
    }
    // Legacy / text-only — defer to the existing parser, but ONLY when the
    // text carries an explicit numeric quantity. parseIngredientQuantity
    // defaults unrecognized text to 1/piece ("salt to taste"); trusting
    // that would fabricate a scalable amount (W-A2 violation). No digit →
    // drop (unscaled, never invented).
    if (!/\d/.test(r.text)) continue;
    const parsed = parseIngredientQuantity(r.text);
    if (parsed && Number.isFinite(parsed.amount) && parsed.amount > 0) {
      out.push({ name: r.text, amount: parsed.amount, unit: parsed.unit });
    }
  }
  return out;
}
