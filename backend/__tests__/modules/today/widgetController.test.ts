// P2 retention — widget data layer pure picker.

import { pickFromMealPlan } from '../../../src/modules/today/widgetController';

const todayAt = (h: number, m: number = 0): Date => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

describe('pickFromMealPlan', () => {
  const now = new Date();

  it("returns today's dinner from the active meal plan", () => {
    const meals = [
      {
        mealType: 'dinner',
        date: todayAt(19),
        recipe: {
          id: 'r1',
          title: 'Fesenjan',
          imageUrl: 'https://x/f.jpg',
          cookTime: 45,
          cuisine: 'Persian',
        },
      },
    ];
    const out = pickFromMealPlan(meals, now);
    expect(out?.recipeId).toBe('r1');
    expect(out?.deepLink).toBe('sazon://recipe/r1');
    expect(out?.eyebrow).toBe("TONIGHT'S PLATE");
  });

  it("ignores breakfast/lunch slots", () => {
    const meals = [
      {
        mealType: 'lunch',
        date: todayAt(12),
        recipe: {
          id: 'r1',
          title: 'Salad',
          imageUrl: null,
          cookTime: 10,
          cuisine: null,
        },
      },
    ];
    expect(pickFromMealPlan(meals, now)).toBeNull();
  });

  it("ignores meals from other days", () => {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const meals = [
      {
        mealType: 'dinner',
        date: tomorrow,
        recipe: {
          id: 'r1',
          title: 'X',
          imageUrl: null,
          cookTime: null,
          cuisine: null,
        },
      },
    ];
    expect(pickFromMealPlan(meals, now)).toBeNull();
  });

  it("returns null when a dinner has no recipe attached", () => {
    const meals = [{ mealType: 'dinner', date: todayAt(19), recipe: null }];
    expect(pickFromMealPlan(meals, now)).toBeNull();
  });
});
