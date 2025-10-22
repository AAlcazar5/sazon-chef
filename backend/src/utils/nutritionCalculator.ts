// backend/src/utils/nutritionCalculator.ts

/**
 * Nutrition Calculator Utilities
 * Calculates TDEE (Total Daily Energy Expenditure) and macro nutrient recommendations
 * based on user physical profile and fitness goals
 */

export interface PhysicalProfile {
  gender: string;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  fitnessGoal: string;
  bodyFatPercentage?: number;
}

export interface MacroRecommendations {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 * This is the most accurate formula for modern populations
 * 
 * Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
 * Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
 */
export function calculateBMR(profile: PhysicalProfile): number {
  const { gender, age, heightCm, weightKg } = profile;
  
  const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  
  if (gender === 'male') {
    return baseBMR + 5;
  } else if (gender === 'female') {
    return baseBMR - 161;
  } else {
    // For 'other' or unspecified, use average of male and female
    return baseBMR - 78; // Average of +5 and -161
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * TDEE = BMR × Activity Multiplier
 * 
 * Activity Levels and Multipliers:
 * - Sedentary (little or no exercise): BMR × 1.2
 * - Lightly active (light exercise 1-3 days/week): BMR × 1.375
 * - Moderately active (moderate exercise 3-5 days/week): BMR × 1.55
 * - Very active (hard exercise 6-7 days/week): BMR × 1.725
 * - Extra active (very hard exercise & physical job): BMR × 1.9
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const activityMultipliers: { [key: string]: number } = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };
  
  const multiplier = activityMultipliers[activityLevel] || 1.55; // Default to moderate
  return Math.round(bmr * multiplier);
}

/**
 * Adjust TDEE based on fitness goal
 * 
 * - Lose weight: -500 calories (1 lb/week loss)
 * - Maintain: 0 calories
 * - Gain muscle: +300 calories (moderate surplus for lean gains)
 * - Gain weight: +500 calories (bulk)
 */
export function adjustCaloriesForGoal(tdee: number, fitnessGoal: string): number {
  const adjustments: { [key: string]: number } = {
    lose_weight: -500,
    maintain: 0,
    gain_muscle: 300,
    gain_weight: 500
  };
  
  const adjustment = adjustments[fitnessGoal] || 0;
  return Math.max(1200, tdee + adjustment); // Minimum 1200 calories for safety
}

/**
 * Calculate macro nutrient recommendations based on fitness goal
 * 
 * Protein recommendations:
 * - Lose weight: 2.0g per kg bodyweight (muscle preservation)
 * - Maintain: 1.6g per kg bodyweight
 * - Gain muscle: 2.2g per kg bodyweight (muscle building)
 * - Gain weight: 1.8g per kg bodyweight
 * 
 * Fat: 25-30% of total calories
 * Carbs: Remaining calories
 */
export function calculateMacros(profile: PhysicalProfile): MacroRecommendations {
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const targetCalories = adjustCaloriesForGoal(tdee, profile.fitnessGoal);
  
  // Protein calculation (grams per kg bodyweight)
  const proteinMultipliers: { [key: string]: number } = {
    lose_weight: 2.0,
    maintain: 1.6,
    gain_muscle: 2.2,
    gain_weight: 1.8
  };
  
  const proteinMultiplier = proteinMultipliers[profile.fitnessGoal] || 1.6;
  const proteinGrams = Math.round(profile.weightKg * proteinMultiplier);
  const proteinCalories = proteinGrams * 4; // 4 cal/gram
  
  // Fat calculation (25-30% of calories)
  const fatPercentage = profile.fitnessGoal === 'lose_weight' ? 0.25 : 0.30;
  const fatCalories = Math.round(targetCalories * fatPercentage);
  const fatGrams = Math.round(fatCalories / 9); // 9 cal/gram
  
  // Carbs calculation (remaining calories)
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(remainingCalories / 4); // 4 cal/gram
  
  return {
    calories: targetCalories,
    protein: proteinGrams,
    carbs: Math.max(50, carbGrams), // Minimum 50g carbs
    fat: fatGrams,
    bmr: Math.round(bmr),
    tdee: tdee
  };
}

/**
 * Calculate ideal body weight using multiple formulas and return average
 * This helps set realistic target weights
 */
export function calculateIdealWeight(heightCm: number, gender: string): number {
  // Robinson Formula (1983)
  const heightInches = heightCm / 2.54;
  let robinsonWeight: number;
  
  if (gender === 'male') {
    robinsonWeight = 52 + 1.9 * (heightInches - 60);
  } else {
    robinsonWeight = 49 + 1.7 * (heightInches - 60);
  }
  
  // Miller Formula (1983)
  let millerWeight: number;
  if (gender === 'male') {
    millerWeight = 56.2 + 1.41 * (heightInches - 60);
  } else {
    millerWeight = 53.1 + 1.36 * (heightInches - 60);
  }
  
  // Average of both formulas
  return Math.round((robinsonWeight + millerWeight) / 2);
}

/**
 * Estimate body fat percentage based on BMI if not provided
 * Note: This is a rough estimate. Actual body composition measurement is more accurate
 */
export function estimateBodyFat(weightKg: number, heightCm: number, age: number, gender: string): number {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  
  let bodyFat: number;
  if (gender === 'male') {
    bodyFat = 1.20 * bmi + 0.23 * age - 16.2;
  } else {
    bodyFat = 1.20 * bmi + 0.23 * age - 5.4;
  }
  
  // Clamp between reasonable ranges
  return Math.max(5, Math.min(50, Math.round(bodyFat * 10) / 10));
}

/**
 * Validate physical profile data
 */
export function validatePhysicalProfile(profile: Partial<PhysicalProfile>): string[] {
  const errors: string[] = [];
  
  if (!profile.gender || !['male', 'female', 'other'].includes(profile.gender)) {
    errors.push('Gender must be male, female, or other');
  }
  
  if (!profile.age || profile.age < 13 || profile.age > 120) {
    errors.push('Age must be between 13 and 120');
  }
  
  if (!profile.heightCm || profile.heightCm < 100 || profile.heightCm > 250) {
    errors.push('Height must be between 100cm and 250cm (3.3ft - 8.2ft)');
  }
  
  if (!profile.weightKg || profile.weightKg < 30 || profile.weightKg > 300) {
    errors.push('Weight must be between 30kg and 300kg (66lbs - 660lbs)');
  }
  
  const validActivityLevels = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
  if (!profile.activityLevel || !validActivityLevels.includes(profile.activityLevel)) {
    errors.push('Invalid activity level');
  }
  
  const validGoals = ['lose_weight', 'maintain', 'gain_muscle', 'gain_weight'];
  if (!profile.fitnessGoal || !validGoals.includes(profile.fitnessGoal)) {
    errors.push('Invalid fitness goal');
  }
  
  return errors;
}

/**
 * Convert units for display
 */
export const unitConverters = {
  kgToLbs: (kg: number) => Math.round(kg * 2.20462 * 10) / 10,
  lbsToKg: (lbs: number) => Math.round(lbs / 2.20462 * 10) / 10,
  cmToFeetInches: (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  },
  feetInchesToCm: (feet: number, inches: number) => Math.round((feet * 12 + inches) * 2.54)
};

