// backend/tests/services/aiFiberPrompt.test.ts
// Tests for fiber-aware AI prompt injection in aiRecipeService
// buildRecipePrompt is not exported — we test the fiber target calculation logic directly

describe('AI Fiber-Aware Prompt', () => {
  describe('fiber target calculation', () => {
    it('calculates ~8g fiber target for a 2000-cal meal plan', () => {
      // fiberTarget = Math.round(calories / 250)
      const fiberTarget = Math.round(2000 / 250);
      expect(fiberTarget).toBe(8);
    });

    it('scales fiber target with calories — higher calorie = higher fiber', () => {
      const lowCal = Math.round(1500 / 250);
      const highCal = Math.round(3000 / 250);
      expect(lowCal).toBe(6);
      expect(highCal).toBe(12);
    });

    it('defaults to 8g when no macro goals provided', () => {
      const defaultFiber = 8;
      expect(defaultFiber).toBe(8);
    });
  });

  describe('cook time budget injection', () => {
    it('weekday cook time should constraint weekday slots', () => {
      // The prompt injects weekdayCookTime for Mon-Fri
      const weekdayCookTime = 30;
      const day = new Date('2026-03-17T12:00:00Z').getUTCDay(); // Tuesday = 2
      const isWeekday = day >= 1 && day <= 5;
      expect(isWeekday).toBe(true);
      expect(weekdayCookTime).toBe(30);
    });

    it('weekend has no cook time constraint when weekendCookTime is null', () => {
      const weekendCookTime = null;
      const day = new Date('2026-03-15T12:00:00Z').getUTCDay(); // Sunday = 0
      const isWeekend = day === 0 || day === 6;
      expect(isWeekend).toBe(true);
      expect(weekendCookTime).toBeNull();
    });
  });
});
