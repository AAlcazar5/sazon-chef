// frontend/__tests__/hooks/useBuildAPlate.test.ts
// Group 10X Phase 1 — composer state hook unit tests.

import { renderHook, act } from '@testing-library/react-native';
import useBuildAPlate, {
  computeTotals,
  filterByPantryOnly,
  sortByPantryCoverage,
  PANTRY_ONLY_THRESHOLD,
} from '../../hooks/useBuildAPlate';
import type { MealComponent } from '../../lib/api';

const makeComponent = (overrides: Partial<MealComponent>): MealComponent => ({
  id: 'c1',
  slot: 'protein',
  name: 'Salmon',
  defaultPortionGrams: 150,
  caloriesPerPortion: 280,
  proteinG: 30,
  carbsG: 0,
  fatG: 18,
  fiberG: 0,
  cuisineTags: [],
  dietaryTags: [],
  cookMethodHint: 'pan_sear',
  pantryIngredientNames: ['salmon'],
  pantryCoveragePercent: 100,
  ...overrides,
});

describe('useBuildAPlate', () => {
  it('starts empty with zero totals', () => {
    const { result } = renderHook(() => useBuildAPlate());
    expect(result.current.selections).toEqual({});
    expect(result.current.totals.calories).toBe(0);
    expect(result.current.selectedSlotsCount).toBe(0);
  });

  it('setSlot adds a component immutably', () => {
    const { result } = renderHook(() => useBuildAPlate());
    const protein = makeComponent({ id: 'p1' });
    act(() => result.current.setSlot('protein', protein));
    expect(result.current.selections.protein).toBe(protein);
    expect(result.current.totals.calories).toBe(280);
  });

  it('setSlot with undefined removes selection', () => {
    const protein = makeComponent({ id: 'p1' });
    const { result } = renderHook(() => useBuildAPlate({ selections: { protein } }));
    act(() => result.current.setSlot('protein', undefined));
    expect(result.current.selections.protein).toBeUndefined();
  });

  it('toggleLock flips lock state per slot', () => {
    const { result } = renderHook(() => useBuildAPlate());
    act(() => result.current.toggleLock('protein'));
    expect(result.current.locks.protein).toBe(true);
    act(() => result.current.toggleLock('protein'));
    expect(result.current.locks.protein).toBe(false);
  });

  it('rollUnlocked swaps unlocked slots only', () => {
    const lockedSalmon = makeComponent({ id: 'salmon', slot: 'protein' });
    const farro = makeComponent({ id: 'farro', slot: 'base', name: 'Farro' });
    const rice = makeComponent({ id: 'rice', slot: 'base', name: 'Rice' });
    const { result } = renderHook(() =>
      useBuildAPlate({
        selections: { protein: lockedSalmon, base: farro },
        locks: { protein: true },
      }),
    );
    act(() => result.current.rollUnlocked({ protein: [lockedSalmon], base: [rice] }));
    expect(result.current.selections.protein?.id).toBe('salmon');
    expect(result.current.selections.base?.id).toBe('rice');
  });

  it('togglePantryOnly toggles boolean', () => {
    const { result } = renderHook(() => useBuildAPlate());
    expect(result.current.pantryOnly).toBe(false);
    act(() => result.current.togglePantryOnly());
    expect(result.current.pantryOnly).toBe(true);
  });

  it('reset clears all state', () => {
    const protein = makeComponent({ id: 'p1' });
    const { result } = renderHook(() =>
      useBuildAPlate({ selections: { protein }, locks: { protein: true }, pantryOnly: true }),
    );
    act(() => result.current.reset());
    expect(result.current.selections).toEqual({});
    expect(result.current.locks).toEqual({});
    expect(result.current.pantryOnly).toBe(false);
  });
});

describe('computeTotals', () => {
  it('sums macros across all slots', () => {
    const totals = computeTotals({
      protein: makeComponent({ id: 'a', caloriesPerPortion: 200, proteinG: 30, carbsG: 0, fatG: 10, fiberG: 0, pantryCoveragePercent: 100 }),
      base: makeComponent({ id: 'b', caloriesPerPortion: 150, proteinG: 5, carbsG: 30, fatG: 1, fiberG: 4, pantryCoveragePercent: 50 }),
    });
    expect(totals.calories).toBe(350);
    expect(totals.protein).toBe(35);
    expect(totals.carbs).toBe(30);
    expect(totals.fat).toBe(11);
    expect(totals.fiber).toBe(4);
    expect(totals.pantryCoveragePercent).toBe(75);
  });

  it('returns zero totals for empty selections', () => {
    expect(computeTotals({})).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      pantryCoveragePercent: 0,
    });
  });
});

describe('filterByPantryOnly', () => {
  const items = [
    makeComponent({ id: 'a', pantryCoveragePercent: 100 }),
    makeComponent({ id: 'b', pantryCoveragePercent: 50 }),
    makeComponent({ id: 'c', pantryCoveragePercent: PANTRY_ONLY_THRESHOLD }),
  ];

  it('returns all items when pantryOnly is off', () => {
    expect(filterByPantryOnly(items, false)).toHaveLength(3);
  });

  it('hides items below the threshold when pantryOnly is on', () => {
    const result = filterByPantryOnly(items, true);
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.id === 'b')).toBeUndefined();
  });
});

describe('sortByPantryCoverage', () => {
  it('sorts descending by pantry coverage', () => {
    const sorted = sortByPantryCoverage([
      makeComponent({ id: 'a', pantryCoveragePercent: 30 }),
      makeComponent({ id: 'b', pantryCoveragePercent: 90 }),
      makeComponent({ id: 'c', pantryCoveragePercent: 60 }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('useBuildAPlate — onSwapAway (Phase 4)', () => {
  it('does NOT call onSwapAway when setting a slot that had no prior selection', () => {
    const onSwapAway = jest.fn();
    const { result } = renderHook(() => useBuildAPlate({ onSwapAway }));
    const protein = makeComponent({ id: 'salmon', slot: 'protein' });
    act(() => result.current.setSlot('protein', protein));
    expect(onSwapAway).not.toHaveBeenCalled();
  });

  it('calls onSwapAway with the previous component id when replacing an existing selection', () => {
    const onSwapAway = jest.fn();
    const salmon = makeComponent({ id: 'salmon', slot: 'protein' });
    const chicken = makeComponent({ id: 'chicken', slot: 'protein', name: 'Chicken' });
    const { result } = renderHook(() =>
      useBuildAPlate({ selections: { protein: salmon }, onSwapAway }),
    );
    act(() => result.current.setSlot('protein', chicken));
    expect(onSwapAway).toHaveBeenCalledTimes(1);
    expect(onSwapAway).toHaveBeenCalledWith('salmon', 'protein');
  });

  it('does NOT call onSwapAway when clearing a slot (setting undefined)', () => {
    const onSwapAway = jest.fn();
    const salmon = makeComponent({ id: 'salmon', slot: 'protein' });
    const { result } = renderHook(() =>
      useBuildAPlate({ selections: { protein: salmon }, onSwapAway }),
    );
    act(() => result.current.setSlot('protein', undefined));
    expect(onSwapAway).not.toHaveBeenCalled();
  });
});
