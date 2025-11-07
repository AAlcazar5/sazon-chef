// backend/src/utils/weightGoalCalculator.ts
// Weight goal calculator with calorie deficit and step requirements (Phase 6, Group 12)

import { calculateBMR, calculateTDEE, type PhysicalProfile } from './nutritionCalculator';

export interface WeightGoal {
  currentWeightKg: number;
  targetWeightKg: number;
  targetDate: Date;
  weeksToGoal: number;
  totalWeightChangeKg: number;
  dailyCalorieDeficit: number; // Negative for weight loss, positive for weight gain
  requiredCaloriesPerDay: number; // How many calories to eat
  requiredStepsPerDay: number; // Steps needed to achieve part of deficit
  caloriesFromSteps: number; // Calories burned from required steps
  caloriesFromDiet: number; // Remaining calories to adjust from diet
}

export interface WeightProgress {
  currentWeightKg: number;
  targetWeightKg: number;
  progressPercentage: number; // 0-100
  weightLostKg: number; // Positive for weight loss
  daysRemaining: number;
  projectedCompletionDate: Date | null; // Based on current rate
  onTrack: boolean;
}

/**
 * Calculate weight loss/gain goal with required calorie deficit and steps
 */
export function calculateWeightGoal(
  currentWeightKg: number,
  targetWeightKg: number,
  targetDate: Date,
  physicalProfile: PhysicalProfile
): WeightGoal {
  const now = new Date();
  const daysToGoal = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const weeksToGoal = daysToGoal / 7;
  
  const totalWeightChangeKg = targetWeightKg - currentWeightKg;
  const isWeightLoss = totalWeightChangeKg < 0;
  
  // Calculate required calorie deficit/surplus
  // 1 kg of body weight ≈ 7700 calories
  // Daily deficit needed = (total weight change × 7700) / days to goal
  const totalCalorieChange = totalWeightChangeKg * 7700;
  const dailyCalorieDeficit = totalCalorieChange / daysToGoal;
  
  // Calculate TDEE
  const bmr = calculateBMR(physicalProfile);
  const tdee = calculateTDEE(bmr, physicalProfile.activityLevel);
  
  // Calculate how to split deficit between steps (exercise) and diet
  // Strategy: Use steps for up to 50% of deficit, rest from diet
  // But cap steps at reasonable amount (15,000 steps ≈ 600-700 calories)
  
  // Calculate calories per step
  const strideLengthMeters = physicalProfile.gender.toLowerCase() === 'male' 
    ? (physicalProfile.heightCm / 100) * 0.415
    : (physicalProfile.heightCm / 100) * 0.413;
  
  const distancePerStepKm = (strideLengthMeters * 1) / 1000; // Distance in km per step
  const walkingSpeedKmh = 4.8; // Average walking speed
  const timePerStepHours = distancePerStepKm / walkingSpeedKmh;
  const caloriesPerStep = 3.5 * physicalProfile.weightKg * timePerStepHours;
  
  // Target steps: Aim for 50% of deficit from steps, but cap at 15,000 steps
  const targetCaloriesFromSteps = Math.min(Math.abs(dailyCalorieDeficit) * 0.5, 600);
  const requiredStepsPerDay = Math.min(15000, Math.round(targetCaloriesFromSteps / caloriesPerStep));
  const caloriesFromSteps = requiredStepsPerDay * caloriesPerStep;
  
  // Remaining deficit from diet
  const remainingDeficit = Math.abs(dailyCalorieDeficit) - caloriesFromSteps;
  const caloriesFromDiet = isWeightLoss ? -remainingDeficit : remainingDeficit;
  
  // Required calories per day = TDEE - deficit + calories from steps
  // For weight loss: TDEE - (deficit - calories from steps) = TDEE - remaining deficit
  // For weight gain: TDEE + (surplus - calories from steps) = TDEE + remaining surplus
  const requiredCaloriesPerDay = isWeightLoss
    ? Math.max(1200, tdee - remainingDeficit) // Minimum 1200 for safety
    : tdee + remainingDeficit;

  return {
    currentWeightKg,
    targetWeightKg,
    targetDate,
    weeksToGoal,
    totalWeightChangeKg,
    dailyCalorieDeficit: Math.round(dailyCalorieDeficit),
    requiredCaloriesPerDay: Math.round(requiredCaloriesPerDay),
    requiredStepsPerDay,
    caloriesFromSteps: Math.round(caloriesFromSteps),
    caloriesFromDiet: Math.round(caloriesFromDiet),
  };
}

/**
 * Calculate progress towards weight goal
 */
export function calculateWeightProgress(
  currentWeightKg: number,
  targetWeightKg: number,
  targetDate: Date,
  weightHistory: Array<{ weightKg: number; date: Date }>
): WeightProgress {
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  const totalWeightChangeKg = targetWeightKg - weightHistory[0]?.weightKg || currentWeightKg;
  const weightLostKg = (weightHistory[0]?.weightKg || currentWeightKg) - currentWeightKg;
  
  // Calculate progress percentage
  const progressPercentage = totalWeightChangeKg !== 0 
    ? Math.max(0, Math.min(100, (weightLostKg / Math.abs(totalWeightChangeKg)) * 100))
    : 0;
  
  // Calculate projected completion date based on current rate
  let projectedCompletionDate: Date | null = null;
  let onTrack = true;
  
  if (weightHistory.length >= 2) {
    // Calculate average daily weight change
    const firstWeight = weightHistory[weightHistory.length - 1].weightKg;
    const lastWeight = weightHistory[0].weightKg;
    const daysElapsed = Math.max(1, Math.ceil(
      (weightHistory[0].date.getTime() - weightHistory[weightHistory.length - 1].date.getTime()) / (1000 * 60 * 60 * 24)
    ));
    
    const dailyWeightChange = (lastWeight - firstWeight) / daysElapsed;
    const remainingWeightChange = targetWeightKg - currentWeightKg;
    
    if (dailyWeightChange !== 0) {
      const daysToComplete = Math.ceil(Math.abs(remainingWeightChange / dailyWeightChange));
      projectedCompletionDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
      
      // Check if on track (within 10% of target date)
      const daysDifference = Math.abs(daysToComplete - daysRemaining);
      onTrack = daysDifference <= daysRemaining * 0.1;
    }
  }

  return {
    currentWeightKg,
    targetWeightKg,
    progressPercentage,
    weightLostKg,
    daysRemaining,
    projectedCompletionDate,
    onTrack,
  };
}

/**
 * Calculate steps needed to burn a specific number of calories
 */
export function calculateStepsForCalories(
  targetCalories: number,
  physicalProfile: PhysicalProfile
): number {
  const strideLengthMeters = physicalProfile.gender.toLowerCase() === 'male' 
    ? (physicalProfile.heightCm / 100) * 0.415
    : (physicalProfile.heightCm / 100) * 0.413;
  
  const distancePerStepKm = (strideLengthMeters * 1) / 1000;
  const walkingSpeedKmh = 4.8;
  const timePerStepHours = distancePerStepKm / walkingSpeedKmh;
  const caloriesPerStep = 3.5 * physicalProfile.weightKg * timePerStepHours;
  
  return Math.round(targetCalories / caloriesPerStep);
}

/**
 * Calculate calories burned from steps
 */
export function calculateCaloriesFromSteps(
  steps: number,
  physicalProfile: PhysicalProfile
): number {
  const strideLengthMeters = physicalProfile.gender.toLowerCase() === 'male' 
    ? (physicalProfile.heightCm / 100) * 0.415
    : (physicalProfile.heightCm / 100) * 0.413;
  
  const distanceKm = (steps * strideLengthMeters) / 1000;
  const walkingSpeedKmh = 4.8;
  const timeHours = distanceKm / walkingSpeedKmh;
  const caloriesBurned = 3.5 * physicalProfile.weightKg * timeHours;
  
  return Math.round(caloriesBurned);
}
