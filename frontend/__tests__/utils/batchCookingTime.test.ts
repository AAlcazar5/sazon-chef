import {
  estimateBatchCookingTime,
  formatTimeEstimate,
  getTimeSavingsMessage,
  BatchCookingTimeEstimate,
} from '../../utils/batchCookingTime';

describe('Batch Cooking Time Estimation', () => {
  describe('estimateBatchCookingTime', () => {
    test('should estimate time for 2x scaling', () => {
      const estimate = estimateBatchCookingTime(60, 4, 8, 'medium');

      expect(estimate.originalTime).toBe(60);
      expect(estimate.scaleFactor).toBe(2);
      expect(estimate.estimatedTime).toBeGreaterThan(60);
      expect(estimate.estimatedTime).toBeLessThan(120); // Should be less than linear
      expect(estimate.breakdown).toHaveProperty('prepTime');
      expect(estimate.breakdown).toHaveProperty('activeCookingTime');
      expect(estimate.breakdown).toHaveProperty('passiveCookingTime');
      expect(estimate.efficiencyGain).toBeGreaterThan(0);
    });

    test('should estimate time for 3x scaling', () => {
      const estimate = estimateBatchCookingTime(60, 4, 12, 'medium');

      expect(estimate.scaleFactor).toBe(3);
      expect(estimate.estimatedTime).toBeLessThan(180); // Less than linear
      expect(estimate.tips.length).toBeGreaterThan(0);
    });

    test('should adjust for easy recipes (more passive time)', () => {
      const easyEstimate = estimateBatchCookingTime(60, 4, 8, 'easy');
      const mediumEstimate = estimateBatchCookingTime(60, 4, 8, 'medium');

      // Easy recipes should have more passive cooking time
      expect(easyEstimate.breakdown.passiveCookingTime).toBeGreaterThan(
        mediumEstimate.breakdown.passiveCookingTime
      );
    });

    test('should adjust for hard recipes (more prep and active time)', () => {
      const hardEstimate = estimateBatchCookingTime(60, 4, 8, 'hard');
      const mediumEstimate = estimateBatchCookingTime(60, 4, 8, 'medium');

      // Hard recipes should have more prep and active time
      expect(hardEstimate.breakdown.prepTime).toBeGreaterThan(
        mediumEstimate.breakdown.prepTime
      );
      expect(hardEstimate.breakdown.activeCookingTime).toBeGreaterThan(
        mediumEstimate.breakdown.activeCookingTime
      );
    });

    test('should add buffer time for very large batches', () => {
      const largeBatch = estimateBatchCookingTime(60, 4, 20, 'medium'); // 5x
      const smallBatch = estimateBatchCookingTime(60, 4, 8, 'medium'); // 2x

      // Large batch should have extra time added (buffer time is added, so it should be more than proportional)
      expect(largeBatch.estimatedTime).toBeGreaterThan(smallBatch.estimatedTime);
      expect(largeBatch.tips.some(tip => tip.includes('15 minutes'))).toBe(true);
    });

    test('should generate appropriate tips for large batches', () => {
      const estimate = estimateBatchCookingTime(60, 4, 12, 'medium'); // 3x

      expect(estimate.tips.length).toBeGreaterThan(0);
      expect(estimate.tips.some(tip => 
        tip.toLowerCase().includes('batch') || 
        tip.toLowerCase().includes('prep')
      )).toBe(true);
    });

    test('should handle zero original servings', () => {
      const estimate = estimateBatchCookingTime(60, 0, 8, 'medium');

      expect(estimate.scaleFactor).toBe(Infinity);
      // Should still return valid estimate
      expect(estimate.estimatedTime).toBeGreaterThan(0);
    });

    test('should handle very short cook times', () => {
      const estimate = estimateBatchCookingTime(5, 1, 3, 'easy');

      expect(estimate.estimatedTime).toBeGreaterThan(5);
      expect(estimate.estimatedTime).toBeLessThan(20); // Allow some buffer for rounding
    });

    test('should handle very long cook times', () => {
      const estimate = estimateBatchCookingTime(180, 4, 12, 'hard');

      expect(estimate.estimatedTime).toBeGreaterThan(180);
      expect(estimate.estimatedTime).toBeLessThan(540); // Less than linear
    });

    test('should calculate efficiency gain correctly', () => {
      const estimate = estimateBatchCookingTime(60, 4, 8, 'medium');
      const linearTime = 60 * 2;

      expect(estimate.efficiencyGain).toBeGreaterThan(0);
      expect(estimate.efficiencyGain).toBeLessThan(100);
      
      // Efficiency gain should reflect time saved
      const actualTimeSaved = linearTime - estimate.estimatedTime;
      const expectedGain = (actualTimeSaved / linearTime) * 100;
      expect(Math.abs(estimate.efficiencyGain - expectedGain)).toBeLessThan(1);
    });
  });

  describe('formatTimeEstimate', () => {
    test('should format minutes less than 60', () => {
      expect(formatTimeEstimate(30)).toBe('30 min');
      expect(formatTimeEstimate(45)).toBe('45 min');
      expect(formatTimeEstimate(0)).toBe('0 min');
    });

    test('should format hours without minutes', () => {
      expect(formatTimeEstimate(60)).toBe('1 hr');
      expect(formatTimeEstimate(120)).toBe('2 hrs');
      expect(formatTimeEstimate(180)).toBe('3 hrs');
    });

    test('should format hours with minutes', () => {
      expect(formatTimeEstimate(90)).toBe('1 hr 30 min');
      expect(formatTimeEstimate(150)).toBe('2 hrs 30 min');
      expect(formatTimeEstimate(125)).toBe('2 hrs 5 min');
    });

    test('should handle large time values', () => {
      expect(formatTimeEstimate(300)).toBe('5 hrs');
      expect(formatTimeEstimate(365)).toBe('6 hrs 5 min');
    });
  });

  describe('getTimeSavingsMessage', () => {
    test('should show savings when time is saved', () => {
      const estimate: BatchCookingTimeEstimate = {
        originalTime: 60,
        estimatedTime: 90,
        scaleFactor: 2,
        breakdown: {
          prepTime: 30,
          activeCookingTime: 40,
          passiveCookingTime: 20,
        },
        efficiencyGain: 25,
        tips: [],
      };

      const message = getTimeSavingsMessage(estimate);
      expect(message).toContain('Saves');
      expect(message).toContain('%');
    });

    test('should handle no savings case', () => {
      const estimate: BatchCookingTimeEstimate = {
        originalTime: 60,
        estimatedTime: 120, // Same as linear
        scaleFactor: 2,
        breakdown: {
          prepTime: 60,
          activeCookingTime: 40,
          passiveCookingTime: 20,
        },
        efficiencyGain: 0,
        tips: [],
      };

      const message = getTimeSavingsMessage(estimate);
      expect(message).toContain('similar');
    });

    test('should format savings percentage correctly', () => {
      const estimate: BatchCookingTimeEstimate = {
        originalTime: 60,
        estimatedTime: 100,
        scaleFactor: 2,
        breakdown: {
          prepTime: 50,
          activeCookingTime: 30,
          passiveCookingTime: 20,
        },
        efficiencyGain: 16.67,
        tips: [],
      };

      const message = getTimeSavingsMessage(estimate);
      expect(message).toMatch(/\d+%/);
    });
  });
});

