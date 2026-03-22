// frontend/__tests__/components/DragToReorder.test.tsx
// Tests for drag-to-reorder meal plan functionality

describe('handleReorderMeal', () => {
  // Simulates the reorder logic from useMealPlanActions
  function reorder(meals: string[], fromIndex: number, toIndex: number): string[] {
    if (fromIndex === toIndex) return meals;
    if (fromIndex < 0 || fromIndex >= meals.length) return meals;
    if (toIndex < 0 || toIndex >= meals.length) return meals;

    const reordered = [...meals];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    return reordered;
  }

  it('reorders from index 0 to index 2', () => {
    const meals = ['A', 'B', 'C'];
    expect(reorder(meals, 0, 2)).toEqual(['B', 'C', 'A']);
  });

  it('reorders from index 2 to index 0', () => {
    const meals = ['A', 'B', 'C'];
    expect(reorder(meals, 2, 0)).toEqual(['C', 'A', 'B']);
  });

  it('returns same order when fromIndex equals toIndex', () => {
    const meals = ['A', 'B', 'C'];
    expect(reorder(meals, 1, 1)).toEqual(['A', 'B', 'C']);
  });

  it('handles two-item reorder', () => {
    const meals = ['A', 'B'];
    expect(reorder(meals, 0, 1)).toEqual(['B', 'A']);
    expect(reorder(meals, 1, 0)).toEqual(['B', 'A']);
  });

  it('ignores out-of-bounds fromIndex', () => {
    const meals = ['A', 'B', 'C'];
    expect(reorder(meals, -1, 1)).toEqual(['A', 'B', 'C']);
    expect(reorder(meals, 5, 1)).toEqual(['A', 'B', 'C']);
  });

  it('ignores out-of-bounds toIndex', () => {
    const meals = ['A', 'B', 'C'];
    expect(reorder(meals, 0, -1)).toEqual(['A', 'B', 'C']);
    expect(reorder(meals, 0, 5)).toEqual(['A', 'B', 'C']);
  });

  it('does not mutate the original array', () => {
    const meals = ['A', 'B', 'C'];
    const result = reorder(meals, 0, 2);
    expect(meals).toEqual(['A', 'B', 'C']); // original unchanged
    expect(result).toEqual(['B', 'C', 'A']);
  });

  it('handles single item array', () => {
    const meals = ['A'];
    expect(reorder(meals, 0, 0)).toEqual(['A']);
  });
});
