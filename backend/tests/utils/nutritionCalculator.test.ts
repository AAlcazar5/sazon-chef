import { 
  calculateBMR, 
  calculateTDEE, 
  calculateMacros, 
  validatePhysicalProfile,
  unitConverters,
  adjustCaloriesForGoal,
  calculateIdealWeight,
  estimateBodyFat
} from '../../src/utils/nutritionCalculator';

describe('Nutrition Calculator', () => {
  describe('calculateBMR', () => {
    test('should calculate BMR correctly for male', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const bmr = calculateBMR(profile);
      // BMR = (10 × 80) + (6.25 × 180) - (5 × 30) + 5 = 800 + 1125 - 150 + 5 = 1780
      expect(bmr).toBeCloseTo(1780, 0);
    });

    test('should calculate BMR correctly for female', () => {
      const profile = {
        gender: 'female',
        age: 25,
        heightCm: 165,
        weightKg: 60,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const bmr = calculateBMR(profile);
      // BMR = (10 × 60) + (6.25 × 165) - (5 × 25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
      expect(bmr).toBeCloseTo(1345.25, 0);
    });

    test('should handle other gender with average calculation', () => {
      const profile = {
        gender: 'other',
        age: 30,
        heightCm: 175,
        weightKg: 70,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const bmr = calculateBMR(profile);
      expect(bmr).toBeGreaterThan(0);
    });

    test('should handle edge case: very young age', () => {
      const profile = {
        gender: 'male',
        age: 13, // Minimum age
        heightCm: 150,
        weightKg: 40,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const bmr = calculateBMR(profile);
      expect(bmr).toBeGreaterThan(0);
    });

    test('should handle edge case: very old age', () => {
      const profile = {
        gender: 'female',
        age: 120, // Maximum age
        heightCm: 160,
        weightKg: 50,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const bmr = calculateBMR(profile);
      expect(bmr).toBeGreaterThan(0);
    });
  });

  describe('calculateTDEE', () => {
    test('should apply correct activity multipliers', () => {
      const bmr = 1500;
      
      expect(calculateTDEE(bmr, 'sedentary')).toBe(1800);
      expect(calculateTDEE(bmr, 'lightly_active')).toBe(2063);
      expect(calculateTDEE(bmr, 'moderately_active')).toBe(2325);
      expect(calculateTDEE(bmr, 'very_active')).toBe(2588);
      expect(calculateTDEE(bmr, 'extra_active')).toBe(2850);
    });

    test('should handle invalid activity level', () => {
      const bmr = 1500;
      const tdee = calculateTDEE(bmr, 'invalid_level');
      expect(tdee).toBe(2325); // Should default to moderate
    });

    test('should handle undefined activity level', () => {
      const bmr = 1500;
      const tdee = calculateTDEE(bmr, undefined as any);
      expect(tdee).toBe(2325); // Should default to moderate
    });
  });

  describe('adjustCaloriesForGoal', () => {
    test('should adjust calories for weight loss', () => {
      const tdee = 2000;
      const adjusted = adjustCaloriesForGoal(tdee, 'lose_weight');
      expect(adjusted).toBe(1500); // 2000 - 500
    });

    test('should maintain calories for maintenance', () => {
      const tdee = 2000;
      const adjusted = adjustCaloriesForGoal(tdee, 'maintain');
      expect(adjusted).toBe(2000);
    });

    test('should increase calories for muscle gain', () => {
      const tdee = 2000;
      const adjusted = adjustCaloriesForGoal(tdee, 'gain_muscle');
      expect(adjusted).toBe(2300); // 2000 + 300
    });

    test('should increase calories for weight gain', () => {
      const tdee = 2000;
      const adjusted = adjustCaloriesForGoal(tdee, 'gain_weight');
      expect(adjusted).toBe(2500); // 2000 + 500
    });

    test('should enforce minimum calories', () => {
      const tdee = 1000;
      const adjusted = adjustCaloriesForGoal(tdee, 'lose_weight');
      expect(adjusted).toBe(1200); // Minimum 1200 calories
    });

    test('should handle invalid goal', () => {
      const tdee = 2000;
      const adjusted = adjustCaloriesForGoal(tdee, 'invalid_goal');
      expect(adjusted).toBe(2000); // No adjustment
    });
  });

  describe('calculateMacros', () => {
    test('should calculate macros for weight loss', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'lose_weight'
      };
      
      const macros = calculateMacros(profile);
      
      expect(macros.calories).toBeLessThan(2500); // Should be reduced for weight loss
      expect(macros.protein).toBe(160); // 2.0g per kg for weight loss
      expect(macros.fat).toBeGreaterThan(0);
      expect(macros.carbs).toBeGreaterThan(50); // Minimum carbs
      expect(macros.bmr).toBeGreaterThan(0);
      expect(macros.tdee).toBeGreaterThan(0);
    });

    test('should calculate macros for muscle gain', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'gain_muscle'
      };
      
      const macros = calculateMacros(profile);
      
      expect(macros.protein).toBe(176); // 2.2g per kg for muscle gain
      expect(macros.calories).toBeGreaterThan(2000);
      expect(macros.fat).toBeGreaterThan(0);
      expect(macros.carbs).toBeGreaterThan(50);
    });

    test('should handle extreme weight values', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 300, // Very heavy
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const macros = calculateMacros(profile);
      expect(macros.protein).toBe(480); // 1.6g per kg
      expect(macros.calories).toBeGreaterThan(0);
    });

    test('should handle very light weight', () => {
      const profile = {
        gender: 'female',
        age: 25,
        heightCm: 160,
        weightKg: 35, // Very light
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const macros = calculateMacros(profile);
      expect(macros.protein).toBe(56); // 1.6g per kg
      expect(macros.calories).toBeGreaterThan(0);
    });
  });

  describe('validatePhysicalProfile', () => {
    test('should validate correct profile', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toHaveLength(0);
    });

    test('should catch invalid gender', () => {
      const profile = {
        gender: 'invalid',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Gender must be male, female, or other');
    });

    test('should catch missing gender', () => {
      const profile = {
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Gender must be male, female, or other');
    });

    test('should catch invalid age - too young', () => {
      const profile = {
        gender: 'male',
        age: 5, // Too young
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Age must be between 13 and 120');
    });

    test('should catch invalid age - too old', () => {
      const profile = {
        gender: 'male',
        age: 150, // Too old
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Age must be between 13 and 120');
    });

    test('should catch invalid height - too short', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 50, // Too short
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Height must be between 100cm and 250cm (3.3ft - 8.2ft)');
    });

    test('should catch invalid height - too tall', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 300, // Too tall
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Height must be between 100cm and 250cm (3.3ft - 8.2ft)');
    });

    test('should catch invalid weight - too light', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 5, // Too light
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Weight must be between 30kg and 300kg (66lbs - 660lbs)');
    });

    test('should catch invalid weight - too heavy', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 500, // Too heavy
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Weight must be between 30kg and 300kg (66lbs - 660lbs)');
    });

    test('should catch invalid activity level', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'invalid_level',
        fitnessGoal: 'maintain'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Invalid activity level');
    });

    test('should catch invalid fitness goal', () => {
      const profile = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'invalid_goal'
      };
      
      const errors = validatePhysicalProfile(profile);
      expect(errors).toContain('Invalid fitness goal');
    });
  });

  describe('Unit Converters', () => {
    test('should convert kg to lbs accurately', () => {
      expect(unitConverters.kgToLbs(70)).toBeCloseTo(154.3, 1);
      expect(unitConverters.kgToLbs(100)).toBeCloseTo(220.5, 1);
      expect(unitConverters.kgToLbs(0)).toBe(0);
    });

    test('should convert lbs to kg accurately', () => {
      expect(unitConverters.lbsToKg(154.3)).toBeCloseTo(70, 1);
      expect(unitConverters.lbsToKg(220.5)).toBeCloseTo(100, 1);
      expect(unitConverters.lbsToKg(0)).toBe(0);
    });

    test('should convert cm to feet/inches', () => {
      const result = unitConverters.cmToFeetInches(180);
      expect(result.feet).toBe(5);
      expect(result.inches).toBe(11);
    });

    test('should convert feet/inches to cm', () => {
      const cm = unitConverters.feetInchesToCm(5, 10);
      expect(cm).toBe(178);
    });

    test('should handle edge case: very tall person', () => {
      const result = unitConverters.cmToFeetInches(250);
      expect(result.feet).toBe(8);
      expect(result.inches).toBe(2);
    });

    test('should handle edge case: very short person', () => {
      const result = unitConverters.cmToFeetInches(100);
      expect(result.feet).toBe(3);
      expect(result.inches).toBe(3);
    });

    test('should handle zero values', () => {
      const result = unitConverters.cmToFeetInches(0);
      expect(result.feet).toBe(0);
      expect(result.inches).toBe(0);
    });
  });

  describe('calculateIdealWeight', () => {
    test('should calculate ideal weight for male', () => {
      const idealWeight = calculateIdealWeight(180, 'male');
      expect(idealWeight).toBeGreaterThan(60);
      expect(idealWeight).toBeLessThan(90);
    });

    test('should calculate ideal weight for female', () => {
      const idealWeight = calculateIdealWeight(165, 'female');
      expect(idealWeight).toBeGreaterThan(45);
      expect(idealWeight).toBeLessThan(70);
    });

    test('should handle other gender', () => {
      const idealWeight = calculateIdealWeight(175, 'other');
      expect(idealWeight).toBeGreaterThan(0);
    });
  });

  describe('estimateBodyFat', () => {
    test('should estimate body fat for male', () => {
      const bodyFat = estimateBodyFat(80, 180, 30, 'male');
      expect(bodyFat).toBeGreaterThan(5);
      expect(bodyFat).toBeLessThan(50);
    });

    test('should estimate body fat for female', () => {
      const bodyFat = estimateBodyFat(60, 165, 25, 'female');
      expect(bodyFat).toBeGreaterThan(5);
      expect(bodyFat).toBeLessThan(50);
    });

    test('should clamp extreme values', () => {
      const bodyFat = estimateBodyFat(200, 150, 20, 'male');
      expect(bodyFat).toBeLessThanOrEqual(50);
      expect(bodyFat).toBeGreaterThanOrEqual(5);
    });
  });
});
