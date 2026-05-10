// frontend/lib/buildAPlateExport.ts
// ROADMAP 4.0 F5 — Map Build-a-Plate composer state into the PlateMenuPlate
// shape that PlateMenuExportButton consumes. Each filled slot becomes one
// component column with one variant (the selected MealComponent). The PDF
// renders fine with single-variant columns — that's how a saved plate
// without alternates already looks today.

import type {
  PlateMenuPlate,
  PlateMenuComponent,
  PlateMenuVariant,
} from '../components/recipe/PlateMenuExportButton';

interface MealComponentLite {
  id: string;
  name: string;
  defaultPortionGrams?: number | null;
}

type SlotKey = 'protein' | 'base' | 'vegetable' | 'sauce' | 'garnish';
type Selections = Partial<Record<SlotKey, MealComponentLite | undefined>>;

interface PlateTotalsLite {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

const SLOT_LABEL: Record<SlotKey, string> = {
  protein: 'Protein',
  base: 'Base',
  vegetable: 'Vegetable',
  sauce: 'Sauce',
  garnish: 'Garnish',
};

const SLOT_ORDER: SlotKey[] = ['protein', 'base', 'vegetable', 'sauce', 'garnish'];

/**
 * Convert composer state to the PlateMenuPlate shape.
 *
 * Returns null when no slot has a selection (export button should hide).
 */
export function composerToMenuPlate(args: {
  plateId: string;
  title: string;
  selections: Selections;
  totals?: PlateTotalsLite;
}): PlateMenuPlate | null {
  const { plateId, title, selections, totals } = args;

  const components: PlateMenuComponent[] = [];
  for (const slot of SLOT_ORDER) {
    const selection = selections[slot];
    if (!selection) continue;
    const variant: PlateMenuVariant = {
      id: selection.id,
      name: selection.name,
      portionGrams:
        typeof selection.defaultPortionGrams === 'number'
          ? selection.defaultPortionGrams
          : undefined,
    };
    components.push({
      slot,
      label: SLOT_LABEL[slot],
      variants: [variant],
    });
  }

  if (components.length === 0) return null;

  return {
    id: plateId,
    title,
    components,
    totalCalories: totals?.calories,
    totalProtein: totals?.protein,
    totalCarbs: totals?.carbs,
    totalFat: totals?.fat,
  };
}
