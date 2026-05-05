// frontend/__tests__/lib/buildAPlateExport.test.ts

import { composerToMenuPlate } from '../../lib/buildAPlateExport';

describe('composerToMenuPlate', () => {
  it('returns null when no slot is selected', () => {
    const result = composerToMenuPlate({
      plateId: 'p1',
      title: 'My plate',
      selections: {},
    });
    expect(result).toBeNull();
  });

  it('returns a plate with one component per filled slot', () => {
    const result = composerToMenuPlate({
      plateId: 'p1',
      title: 'My plate',
      selections: {
        protein: { id: 'salmon', displayName: 'Salmon', baseGrams: 150 },
        base: { id: 'farro', displayName: 'Farro', baseGrams: 100 },
        vegetable: { id: 'carrots', displayName: 'Roasted carrots' },
      },
    });
    expect(result?.components).toHaveLength(3);
    expect(result?.components[0].slot).toBe('protein');
    expect(result?.components[0].variants[0].name).toBe('Salmon');
  });

  it('preserves slot order: protein → base → vegetable → sauce → garnish', () => {
    const result = composerToMenuPlate({
      plateId: 'p1',
      title: 'My plate',
      selections: {
        garnish: { id: 'g', displayName: 'Sesame seeds' },
        protein: { id: 'p', displayName: 'Tofu' },
        sauce: { id: 's', displayName: 'Tahini' },
        base: { id: 'b', displayName: 'Rice' },
      },
    });
    const slots = result?.components.map((c) => c.slot);
    expect(slots).toEqual(['protein', 'base', 'sauce', 'garnish']);
  });

  it('omits portionGrams when baseGrams is missing', () => {
    const result = composerToMenuPlate({
      plateId: 'p1',
      title: 'My plate',
      selections: {
        protein: { id: 'p', displayName: 'Tofu' },
      },
    });
    expect(result?.components[0].variants[0].portionGrams).toBeUndefined();
  });

  it('passes totals through unchanged', () => {
    const result = composerToMenuPlate({
      plateId: 'p1',
      title: 'My plate',
      selections: {
        protein: { id: 'p', displayName: 'Tofu' },
      },
      totals: { calories: 600, protein: 30, carbs: 50, fat: 22 },
    });
    expect(result?.totalCalories).toBe(600);
    expect(result?.totalProtein).toBe(30);
    expect(result?.totalCarbs).toBe(50);
    expect(result?.totalFat).toBe(22);
  });

  it('uses a single variant per component (no alternates from composer)', () => {
    const result = composerToMenuPlate({
      plateId: 'p1',
      title: 'My plate',
      selections: {
        protein: { id: 'p', displayName: 'Tofu' },
      },
    });
    expect(result?.components[0].variants).toHaveLength(1);
  });

  it('passes the title through to the menu', () => {
    const result = composerToMenuPlate({
      plateId: 'p1',
      title: 'Tonight\'s dinner',
      selections: {
        protein: { id: 'p', displayName: 'Tofu' },
      },
    });
    expect(result?.title).toBe("Tonight's dinner");
  });
});
