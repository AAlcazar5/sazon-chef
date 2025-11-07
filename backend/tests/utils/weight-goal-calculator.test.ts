// backend/tests/utils/weight-goal-calculator.test.ts
import {
  calculateWeightGoal,
  calculateWeightProgress,
  calculateStepsForCalories,
  calculateCaloriesFromSteps,
  WeightGoal,
} from '../../src/utils/weightGoalCalculator';
import type { PhysicalProfile } from '../../src/utils/nutritionCalculator';

describe('Weight Goal Calculator', () => {
  const mockPhysicalProfile: PhysicalProfile = {
    gender: 'male',
    age: 30,
    heightCm: 175,
    weightKg: 80,
    activityLevel: 'moderately_active',
    fitnessGoal: 'lose_weight',
  };

  describe('calculateWeightGoal', () => {
    it('should calculate weight loss goal with calorie deficit and steps', () => {
      const currentWeight = 80; // kg
      const targetWeight = 75; // kg (lose 5 kg)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 35); // 5 weeks

      const goal = calculateWeightGoal(
        currentWeight,
        targetWeight,
        targetDate,
        mockPhysicalProfile
      );

      expect(goal.currentWeightKg).toBe(80);
      expect(goal.targetWeightKg).toBe(75);
      expect(goal.totalWeightChangeKg).toBe(-5); // Negative for weight loss
      expect(goal.dailyCalorieDeficit).toBeLessThan(0); // Negative for deficit
      expect(goal.requiredCaloriesPerDay).toBeGreaterThan(0);
      expect(goal.requiredStepsPerDay).toBeGreaterThan(0);
      expect(goal.caloriesFromSteps).toBeGreaterThan(0);
      expect(goal.caloriesFromDiet).toBeLessThan(0); // Negative for diet reduction
    });

    it('should calculate weight gain goal with calorie surplus', () => {
      const currentWeight = 70;
      const targetWeight = 75; // gain 5 kg
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 35); // 5 weeks

      const goal = calculateWeightGoal(
        currentWeight,
        targetWeight,
        targetDate,
        mockPhysicalProfile
      );

      expect(goal.totalWeightChangeKg).toBe(5); // Positive for weight gain
      expect(goal.dailyCalorieDeficit).toBeGreaterThan(0); // Positive for surplus
      expect(goal.requiredCaloriesPerDay).toBeGreaterThan(0);
      expect(goal.caloriesFromDiet).toBeGreaterThan(0); // Positive for diet increase
    });

    it('should calculate reasonable step requirements', () => {
      const currentWeight = 80;
      const targetWeight = 75;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 35);

      const goal = calculateWeightGoal(
        currentWeight,
        targetWeight,
        targetDate,
        mockPhysicalProfile
      );

      // Steps should be reasonable (not excessive)
      expect(goal.requiredStepsPerDay).toBeGreaterThan(0);
      expect(goal.requiredStepsPerDay).toBeLessThanOrEqual(15000);
    });

    it('should ensure minimum calorie safety (1200 calories)', () => {
      const currentWeight = 80;
      const targetWeight = 70; // Aggressive 10kg loss
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 35); // Fast timeline

      const goal = calculateWeightGoal(
        currentWeight,
        targetWeight,
        targetDate,
        mockPhysicalProfile
      );

      // Should enforce minimum 1200 calories
      expect(goal.requiredCaloriesPerDay).toBeGreaterThanOrEqual(1200);
    });
  });

  describe('calculateWeightProgress', () => {
    it('should calculate progress correctly', () => {
      const currentWeight = 77; // Lost 3kg from 80kg
      const targetWeight = 75;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14); // 2 weeks remaining

      const weightHistory = [
        { weightKg: 80, date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) }, // 3 weeks ago
        { weightKg: 79, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, // 2 weeks ago
        { weightKg: 78, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },  // 1 week ago
        { weightKg: 77, date: new Date() }, // Today
      ];

      const progress = calculateWeightProgress(
        currentWeight,
        targetWeight,
        targetDate,
        weightHistory
      );

      expect(progress.currentWeightKg).toBe(77);
      expect(progress.targetWeightKg).toBe(75);
      expect(progress.weightLostKg).toBe(3); // Lost 3kg from start
      expect(progress.progressPercentage).toBeGreaterThan(0);
      expect(progress.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should detect if user is on track', () => {
      const currentWeight = 77;
      const targetWeight = 75;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);

      const weightHistory = [
        { weightKg: 80, date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
        { weightKg: 77, date: new Date() },
      ];

      const progress = calculateWeightProgress(
        currentWeight,
        targetWeight,
        targetDate,
        weightHistory
      );

      expect(progress.onTrack).toBeDefined();
      expect(typeof progress.onTrack).toBe('boolean');
    });
  });

  describe('calculateStepsForCalories', () => {
    it('should calculate steps needed to burn calories', () => {
      const targetCalories = 500;
      const steps = calculateStepsForCalories(targetCalories, mockPhysicalProfile);

      expect(steps).toBeGreaterThan(0);
      // Should be reasonable number of steps (roughly 10,000-15,000 for 500 calories)
    });
  });

  describe('calculateCaloriesFromSteps', () => {
    it('should calculate calories burned from steps', () => {
      const steps = 10000;
      const calories = calculateCaloriesFromSteps(steps, mockPhysicalProfile);

      expect(calories).toBeGreaterThan(0);
      // 10,000 steps should burn roughly 300-500 calories depending on weight
      expect(calories).toBeGreaterThan(200);
      expect(calories).toBeLessThan(800);
    });

    it('should return zero for zero steps', () => {
      const calories = calculateCaloriesFromSteps(0, mockPhysicalProfile);
      expect(calories).toBe(0);
    });
  });
});
