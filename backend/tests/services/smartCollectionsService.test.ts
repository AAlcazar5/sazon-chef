// backend/tests/services/smartCollectionsService.test.ts
import {
  SMART_COLLECTION_DEFINITIONS,
  WEATHER_COLLECTION_DEFINITION,
  getSmartCollectionById,
  buildRecipeFilter,
  buildWeatherFilter,
  recipeMatchesSmartCollection,
  recipeMatchesWeather,
  getCurrentMealType,
  type Recipe,
  type WeatherCondition,
} from '../../src/services/smartCollectionsService';

describe('smartCollectionsService', () => {
  describe('SMART_COLLECTION_DEFINITIONS', () => {
    it('exposes the expected set of smart collections', () => {
      const ids = SMART_COLLECTION_DEFINITIONS.map((d) => d.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          'quick_easy',
          'high_protein',
          'under_400_cal',
          'one_pot',
          'budget_friendly',
          'high_fiber',
          'right_now',
        ]),
      );
    });

    it('each definition has id, name, icon, and description', () => {
      SMART_COLLECTION_DEFINITIONS.forEach((def) => {
        expect(def.id).toBeTruthy();
        expect(def.name).toBeTruthy();
        expect(def.icon).toBeTruthy();
        expect(def.description).toBeTruthy();
      });
    });
  });

  describe('getSmartCollectionById', () => {
    it('returns the definition when id is valid', () => {
      const def = getSmartCollectionById('high_protein');
      expect(def).toBeDefined();
      expect(def?.id).toBe('high_protein');
    });

    it('returns undefined for unknown ids', () => {
      expect(getSmartCollectionById('nonexistent')).toBeUndefined();
    });
  });

  describe('buildRecipeFilter', () => {
    it('quick_easy → cookTime ≤ 15 AND difficulty = easy', () => {
      const filter = buildRecipeFilter('quick_easy');
      expect(filter).toEqual({ cookTime: { lte: 15 }, difficulty: 'easy' });
    });

    it('high_protein → protein ≥ 30', () => {
      expect(buildRecipeFilter('high_protein')).toEqual({ protein: { gte: 30 } });
    });

    it('under_400_cal → calories ≤ 400', () => {
      expect(buildRecipeFilter('under_400_cal')).toEqual({ calories: { lte: 400 } });
    });

    it('high_fiber → fiber ≥ 8', () => {
      expect(buildRecipeFilter('high_fiber')).toEqual({ fiber: { gte: 8 } });
    });

    it('budget_friendly → estimatedCostPerServing ≤ 3', () => {
      expect(buildRecipeFilter('budget_friendly')).toEqual({
        estimatedCostPerServing: { lte: 3 },
      });
    });

    it('one_pot → OR across title/description keyword matches', () => {
      const filter = buildRecipeFilter('one_pot');
      expect(filter).toHaveProperty('OR');
      expect(Array.isArray((filter as any).OR)).toBe(true);
      expect((filter as any).OR.length).toBeGreaterThan(0);
    });

    it('returns null for unknown ids', () => {
      expect(buildRecipeFilter('nonexistent')).toBeNull();
    });
  });

  describe('recipeMatchesSmartCollection', () => {
    const base: Recipe = {
      title: 'Test Recipe',
      description: 'A tasty dish',
      cookTime: 30,
      difficulty: 'medium',
      calories: 500,
      protein: 20,
      carbs: 50,
      fat: 15,
      fiber: 4,
      estimatedCostPerServing: null,
    };

    it('quick_easy matches when cookTime ≤ 15 AND difficulty = easy', () => {
      expect(
        recipeMatchesSmartCollection({ ...base, cookTime: 10, difficulty: 'easy' }, 'quick_easy'),
      ).toBe(true);
    });

    it('quick_easy does not match when difficulty is medium', () => {
      expect(
        recipeMatchesSmartCollection({ ...base, cookTime: 10, difficulty: 'medium' }, 'quick_easy'),
      ).toBe(false);
    });

    it('quick_easy does not match when cookTime > 15', () => {
      expect(
        recipeMatchesSmartCollection({ ...base, cookTime: 20, difficulty: 'easy' }, 'quick_easy'),
      ).toBe(false);
    });

    it('high_protein matches when protein ≥ 30', () => {
      expect(recipeMatchesSmartCollection({ ...base, protein: 30 }, 'high_protein')).toBe(true);
      expect(recipeMatchesSmartCollection({ ...base, protein: 45 }, 'high_protein')).toBe(true);
      expect(recipeMatchesSmartCollection({ ...base, protein: 29 }, 'high_protein')).toBe(false);
    });

    it('under_400_cal matches when calories ≤ 400', () => {
      expect(recipeMatchesSmartCollection({ ...base, calories: 400 }, 'under_400_cal')).toBe(true);
      expect(recipeMatchesSmartCollection({ ...base, calories: 401 }, 'under_400_cal')).toBe(false);
    });

    it('high_fiber matches when fiber ≥ 8', () => {
      expect(recipeMatchesSmartCollection({ ...base, fiber: 8 }, 'high_fiber')).toBe(true);
      expect(recipeMatchesSmartCollection({ ...base, fiber: 7 }, 'high_fiber')).toBe(false);
      expect(recipeMatchesSmartCollection({ ...base, fiber: null }, 'high_fiber')).toBe(false);
    });

    it('budget_friendly matches when estimatedCostPerServing ≤ 3', () => {
      expect(
        recipeMatchesSmartCollection({ ...base, estimatedCostPerServing: 2.5 }, 'budget_friendly'),
      ).toBe(true);
      expect(
        recipeMatchesSmartCollection({ ...base, estimatedCostPerServing: 3.1 }, 'budget_friendly'),
      ).toBe(false);
    });

    it('budget_friendly does not match when estimatedCostPerServing is null', () => {
      expect(
        recipeMatchesSmartCollection({ ...base, estimatedCostPerServing: null }, 'budget_friendly'),
      ).toBe(false);
    });

    it('one_pot matches when title contains "one-pot"', () => {
      expect(
        recipeMatchesSmartCollection({ ...base, title: 'One-Pot Chicken Rice' }, 'one_pot'),
      ).toBe(true);
    });

    it('one_pot matches when title contains "sheet pan" (case-insensitive)', () => {
      expect(
        recipeMatchesSmartCollection({ ...base, title: 'SHEET PAN Salmon' }, 'one_pot'),
      ).toBe(true);
    });

    it('one_pot matches when description mentions "skillet"', () => {
      expect(
        recipeMatchesSmartCollection(
          { ...base, description: 'A hearty skillet meal' },
          'one_pot',
        ),
      ).toBe(true);
    });

    it('one_pot does not match regular recipes', () => {
      expect(recipeMatchesSmartCollection(base, 'one_pot')).toBe(false);
    });

    it('returns false for unknown smart collection id', () => {
      expect(recipeMatchesSmartCollection(base, 'nonexistent')).toBe(false);
    });

    describe('right_now', () => {
      it('matches breakfast recipes at 7am', () => {
        const d = new Date(); d.setHours(7, 0, 0, 0);
        expect(recipeMatchesSmartCollection({ ...base, mealType: 'breakfast' }, 'right_now', d)).toBe(true);
      });
      it('does not match dinner at 7am', () => {
        const d = new Date(); d.setHours(7, 0, 0, 0);
        expect(recipeMatchesSmartCollection({ ...base, mealType: 'dinner' }, 'right_now', d)).toBe(false);
      });
      it('matches lunch at 12pm', () => {
        const d = new Date(); d.setHours(12, 0, 0, 0);
        expect(recipeMatchesSmartCollection({ ...base, mealType: 'lunch' }, 'right_now', d)).toBe(true);
      });
      it('matches dinner at 7pm', () => {
        const d = new Date(); d.setHours(19, 0, 0, 0);
        expect(recipeMatchesSmartCollection({ ...base, mealType: 'dinner' }, 'right_now', d)).toBe(true);
      });
      it('matches snack at 3am', () => {
        const d = new Date(); d.setHours(3, 0, 0, 0);
        expect(recipeMatchesSmartCollection({ ...base, mealType: 'snack' }, 'right_now', d)).toBe(true);
      });
      it('does not match when mealType is null', () => {
        const d = new Date(); d.setHours(12, 0, 0, 0);
        expect(recipeMatchesSmartCollection({ ...base, mealType: undefined }, 'right_now', d)).toBe(false);
      });
    });
  });

  describe('getCurrentMealType', () => {
    it('returns breakfast for 5am–10:59am', () => {
      const d = new Date(); d.setHours(5, 0, 0, 0);
      expect(getCurrentMealType(d)).toBe('breakfast');
      d.setHours(10, 59, 0, 0);
      expect(getCurrentMealType(d)).toBe('breakfast');
    });
    it('returns lunch for 11am–2:59pm', () => {
      const d = new Date(); d.setHours(11, 0, 0, 0);
      expect(getCurrentMealType(d)).toBe('lunch');
      d.setHours(14, 59, 0, 0);
      expect(getCurrentMealType(d)).toBe('lunch');
    });
    it('returns dinner for 5pm–9:59pm', () => {
      const d = new Date(); d.setHours(17, 0, 0, 0);
      expect(getCurrentMealType(d)).toBe('dinner');
      d.setHours(21, 59, 0, 0);
      expect(getCurrentMealType(d)).toBe('dinner');
    });
    it('returns snack for all other hours', () => {
      const d = new Date(); d.setHours(3, 0, 0, 0);
      expect(getCurrentMealType(d)).toBe('snack');
      d.setHours(15, 30, 0, 0);
      expect(getCurrentMealType(d)).toBe('snack');
    });
  });

  describe('WEATHER_COLLECTION_DEFINITION', () => {
    it('has id weather_today', () => {
      expect(WEATHER_COLLECTION_DEFINITION.id).toBe('weather_today');
    });
    it('has required fields', () => {
      expect(WEATHER_COLLECTION_DEFINITION.name).toBeTruthy();
      expect(WEATHER_COLLECTION_DEFINITION.icon).toBeTruthy();
      expect(WEATHER_COLLECTION_DEFINITION.description).toBeTruthy();
    });
    it('is not in SMART_COLLECTION_DEFINITIONS (separate endpoint)', () => {
      const ids = SMART_COLLECTION_DEFINITIONS.map((d) => d.id);
      expect(ids).not.toContain('weather_today');
    });
  });

  describe('buildWeatherFilter', () => {
    it('returns OR filter with mealType=dinner or cookTime>=20 for cold', () => {
      const filter = buildWeatherFilter('cold') as any;
      expect(filter.OR).toBeDefined();
      expect(filter.OR.some((c: any) => c.mealType === 'dinner')).toBe(true);
    });
    it('returns same filter for rainy as cold', () => {
      expect(buildWeatherFilter('rainy')).toEqual(buildWeatherFilter('cold'));
    });
    it('returns light-meal filter for hot', () => {
      const filter = buildWeatherFilter('hot') as any;
      expect(filter.OR).toBeDefined();
    });
    it('returns empty filter for mild (all recipes match)', () => {
      expect(buildWeatherFilter('mild')).toEqual({});
    });
  });

  describe('recipeMatchesWeather', () => {
    const base: Recipe = {
      title: 'Test',
      description: '',
      cookTime: 30,
      difficulty: 'medium',
      calories: 400,
      protein: 20,
      carbs: 40,
      fat: 10,
      mealType: 'dinner',
    };

    it('cold: matches dinner recipes', () => {
      expect(recipeMatchesWeather({ ...base, mealType: 'dinner' }, 'cold')).toBe(true);
    });
    it('cold: matches recipes with cookTime >= 20', () => {
      expect(recipeMatchesWeather({ ...base, mealType: 'lunch', cookTime: 25 }, 'cold')).toBe(true);
    });
    it('cold: does not match quick breakfast', () => {
      expect(recipeMatchesWeather({ ...base, mealType: 'breakfast', cookTime: 10 }, 'cold')).toBe(false);
    });
    it('hot: matches low-calorie recipes', () => {
      expect(recipeMatchesWeather({ ...base, calories: 350, cookTime: 30 }, 'hot')).toBe(true);
    });
    it('hot: matches quick recipes', () => {
      expect(recipeMatchesWeather({ ...base, calories: 700, cookTime: 15 }, 'hot')).toBe(true);
    });
    it('mild: matches all recipes', () => {
      const conditions: WeatherCondition[] = ['mild'];
      conditions.forEach((c) => {
        expect(recipeMatchesWeather(base, c)).toBe(true);
      });
    });
  });
});
