// frontend/__tests__/utils/superfoodDetection.test.ts
import { detectSuperfoods, detectRecipeSuperfoods } from '../../utils/superfoodDetection';

describe('detectSuperfoods', () => {
  it('returns empty array for empty string', () => {
    expect(detectSuperfoods('')).toEqual([]);
  });

  // ── Individual superfood detection ───────────────────────────────────────

  it('detects salmon', () => {
    expect(detectSuperfoods('1 lb salmon fillet')).toContain('salmon');
  });

  it('detects wild salmon variant', () => {
    expect(detectSuperfoods('200g wild salmon')).toContain('salmon');
  });

  it('detects olive oil', () => {
    expect(detectSuperfoods('2 tbsp olive oil')).toContain('oliveOil');
  });

  it('detects extra virgin olive oil', () => {
    expect(detectSuperfoods('1 tbsp extra virgin olive oil')).toContain('oliveOil');
  });

  it('detects kale', () => {
    expect(detectSuperfoods('2 cups curly kale, stems removed')).toContain('kale');
  });

  it('detects spinach', () => {
    expect(detectSuperfoods('3 oz baby spinach')).toContain('spinach');
  });

  it('detects blueberries', () => {
    expect(detectSuperfoods('1 cup blueberries')).toContain('blueberries');
  });

  it('detects chia seeds', () => {
    expect(detectSuperfoods('2 tbsp chia seeds')).toContain('chiaSeeds');
  });

  it('detects quinoa', () => {
    expect(detectSuperfoods('1 cup quinoa, rinsed')).toContain('quinoa');
  });

  it('detects avocado', () => {
    expect(detectSuperfoods('1 ripe avocado')).toContain('avocado');
  });

  it('detects chickpeas (maps to beans)', () => {
    expect(detectSuperfoods('1 can chickpeas, drained')).toContain('beans');
  });

  it('detects lentils (maps to beans)', () => {
    expect(detectSuperfoods('1 cup red lentils')).toContain('beans');
  });

  it('detects greek yogurt (maps to fermented)', () => {
    expect(detectSuperfoods('1 cup greek yogurt')).toContain('fermented');
  });

  it('detects miso (maps to fermented)', () => {
    expect(detectSuperfoods('1 tbsp white miso paste')).toContain('fermented');
  });

  it('detects turmeric', () => {
    expect(detectSuperfoods('1 tsp turmeric')).toContain('turmeric');
  });

  it('detects ginger', () => {
    expect(detectSuperfoods('1 tbsp fresh ginger, grated')).toContain('ginger');
  });

  it('detects garlic', () => {
    expect(detectSuperfoods('3 garlic cloves, minced')).toContain('garlic');
  });

  it('detects brown rice', () => {
    expect(detectSuperfoods('1 cup brown rice')).toContain('brownRice');
  });

  it('detects walnuts', () => {
    expect(detectSuperfoods('1/4 cup walnuts')).toContain('walnuts');
  });

  it('detects almonds', () => {
    expect(detectSuperfoods('2 tbsp sliced almonds')).toContain('almonds');
  });

  it('detects sweet potato', () => {
    expect(detectSuperfoods('2 medium sweet potatoes')).toContain('sweetPotato');
  });

  it('detects broccoli', () => {
    expect(detectSuperfoods('2 cups broccoli florets')).toContain('broccoli');
  });

  // ── Case insensitivity ───────────────────────────────────────────────────

  it('is case-insensitive', () => {
    expect(detectSuperfoods('KALE AND SPINACH')).toContain('kale');
    expect(detectSuperfoods('KALE AND SPINACH')).toContain('spinach');
    expect(detectSuperfoods('OLIVE OIL')).toContain('oliveOil');
  });

  // ── Word boundary matching (no false positives) ──────────────────────────

  it('does not false-positive on partial word matches', () => {
    // "calm" should NOT match "salmon"
    expect(detectSuperfoods('calm with some dill')).not.toContain('salmon');
  });

  // ── Multiple categories ──────────────────────────────────────────────────

  it('detects multiple superfood categories in one ingredient string', () => {
    const result = detectSuperfoods('2 tbsp olive oil and 3 garlic cloves');
    expect(result).toContain('oliveOil');
    expect(result).toContain('garlic');
  });

  it('does not duplicate categories for the same ingredient text', () => {
    const result = detectSuperfoods('fresh blueberries and wild blueberries');
    const count = result.filter(sf => sf === 'blueberries').length;
    expect(count).toBe(1);
  });
});

describe('detectRecipeSuperfoods', () => {
  it('returns empty array for empty ingredients list', () => {
    expect(detectRecipeSuperfoods([])).toEqual([]);
  });

  it('returns empty array when no superfoods present', () => {
    expect(detectRecipeSuperfoods(['salt', 'water', 'all-purpose flour'])).toEqual([]);
  });

  it('handles array of strings', () => {
    const result = detectRecipeSuperfoods([
      '1 lb salmon',
      '2 cups spinach',
      '1 tbsp olive oil',
    ]);
    expect(result).toContain('salmon');
    expect(result).toContain('spinach');
    expect(result).toContain('oliveOil');
  });

  it('handles objects with text property', () => {
    const ingredients = [
      { id: '1', text: '1 cup quinoa', order: 1 },
      { id: '2', text: '2 cups kale', order: 2 },
    ];
    const result = detectRecipeSuperfoods(ingredients);
    expect(result).toContain('quinoa');
    expect(result).toContain('kale');
  });

  it('handles objects with name property', () => {
    const ingredients = [
      { name: '3 tbsp chia seeds' },
      { name: '1 avocado' },
    ];
    const result = detectRecipeSuperfoods(ingredients);
    expect(result).toContain('chiaSeeds');
    expect(result).toContain('avocado');
  });

  it('deduplicates the same superfood appearing in multiple ingredients', () => {
    const ingredients = ['1 cup blueberries', '2 tbsp blueberry jam'];
    const result = detectRecipeSuperfoods(ingredients);
    const count = result.filter(sf => sf === 'blueberries').length;
    expect(count).toBe(1);
  });

  it('aggregates superfoods from all ingredients in a full recipe', () => {
    const ingredients = [
      '200g salmon fillet',
      '1 cup brown rice',
      '2 tbsp olive oil',
      '1 tsp turmeric',
      '2 garlic cloves',
      '1 cup broccoli florets',
    ];
    const result = detectRecipeSuperfoods(ingredients);
    expect(result).toContain('salmon');
    expect(result).toContain('brownRice');
    expect(result).toContain('oliveOil');
    expect(result).toContain('turmeric');
    expect(result).toContain('garlic');
    expect(result).toContain('broccoli');
  });
});
