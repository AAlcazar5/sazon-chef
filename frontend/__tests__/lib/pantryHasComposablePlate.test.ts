import { pantryHasComposablePlate, classifyPantrySlot } from '../../lib/pantryHasComposablePlate';
import type { PantryItem } from '../../types';

const item = (name: string, category?: string, id = name): PantryItem => ({
  id,
  userId: 'u1',
  name,
  category,
  createdAt: '',
  updatedAt: '',
});

describe('classifyPantrySlot', () => {
  it('classifies common proteins by name', () => {
    expect(classifyPantrySlot(item('chicken breast'))).toBe('protein');
    expect(classifyPantrySlot(item('salmon'))).toBe('protein');
    expect(classifyPantrySlot(item('tofu'))).toBe('protein');
  });

  it('classifies grains/bases', () => {
    expect(classifyPantrySlot(item('brown rice'))).toBe('grain');
    expect(classifyPantrySlot(item('quinoa'))).toBe('grain');
    expect(classifyPantrySlot(item('farro'))).toBe('grain');
  });

  it('classifies produce by category when category is Produce', () => {
    expect(classifyPantrySlot(item('arugula', 'Produce'))).toBe('produce');
    expect(classifyPantrySlot(item('garlic', 'Produce'))).toBe('produce');
  });

  it('classifies condiments/sauces', () => {
    expect(classifyPantrySlot(item('soy sauce'))).toBe('condiment');
    expect(classifyPantrySlot(item('olive oil'))).toBe('condiment');
    expect(classifyPantrySlot(item('greek yogurt'))).toBe('condiment');
  });

  it('returns null for unknown items', () => {
    expect(classifyPantrySlot(item('mystery powder'))).toBeNull();
  });
});

describe('pantryHasComposablePlate', () => {
  it('returns false when fewer than 4 items', () => {
    const items = [
      item('chicken breast'),
      item('brown rice'),
      item('arugula', 'Produce'),
    ];
    expect(pantryHasComposablePlate(items)).toBe(false);
  });

  it('returns false when 4+ items but only one slot is covered', () => {
    const items = [
      item('chicken breast', undefined, '1'),
      item('salmon', undefined, '2'),
      item('tofu', undefined, '3'),
      item('ground beef', undefined, '4'),
    ];
    expect(pantryHasComposablePlate(items)).toBe(false);
  });

  it('returns true when 4+ items span at least two distinct slots', () => {
    const items = [
      item('chicken breast', undefined, '1'),
      item('brown rice', undefined, '2'),
      item('arugula', 'Produce', '3'),
      item('olive oil', undefined, '4'),
    ];
    expect(pantryHasComposablePlate(items)).toBe(true);
  });

  it('ignores unclassified items toward the slot count', () => {
    const items = [
      item('chicken breast', undefined, '1'),
      item('mystery powder', undefined, '2'),
      item('another mystery', undefined, '3'),
      item('yet another', undefined, '4'),
    ];
    expect(pantryHasComposablePlate(items)).toBe(false);
  });

  it('returns false for an empty pantry', () => {
    expect(pantryHasComposablePlate([])).toBe(false);
  });
});
