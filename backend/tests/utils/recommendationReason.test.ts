// backend/tests/utils/recommendationReason.test.ts
import { generateRecommendationReason, RecommendationContext } from '../../src/utils/recommendationReason';

describe('Recommendation Reason Generator', () => {
  const baseRecipe = {
    cuisine: 'Thai',
    cookTime: 30,
    protein: 25,
    calories: 500,
    mealType: 'dinner',
  };

  const emptyBreakdown = {
    discriminatoryScore: 50,
    macroScore: 50,
    tasteScore: 50,
    healthGoalScore: 50,
    behavioralScore: 0,
    temporalScore: 0,
    healthGrade: 'C',
    healthGradeScore: 50,
  };

  test('returns liked cuisine reason when user likes the cuisine', () => {
    const reason = generateRecommendationReason({
      recipe: baseRecipe,
      scoreBreakdown: emptyBreakdown,
      likedCuisines: ['Thai', 'Japanese'],
    });
    expect(reason).toContain('Thai');
    expect(reason.toLowerCase()).toContain('love');
  });

  test('returns high protein reason for gain_muscle goal', () => {
    const reason = generateRecommendationReason({
      recipe: { ...baseRecipe, protein: 40 },
      scoreBreakdown: emptyBreakdown,
      fitnessGoal: 'gain_muscle',
    });
    expect(reason).toContain('protein');
    expect(reason).toContain('40g');
  });

  test('returns low calorie reason for lose_weight goal', () => {
    const reason = generateRecommendationReason({
      recipe: { ...baseRecipe, calories: 350 },
      scoreBreakdown: emptyBreakdown,
      fitnessGoal: 'lose_weight',
    });
    expect(reason).toContain('350 cal');
  });

  test('returns quick cook reason for ≤20 min recipes', () => {
    const reason = generateRecommendationReason({
      recipe: { ...baseRecipe, cookTime: 15 },
      scoreBreakdown: emptyBreakdown,
    });
    expect(reason).toContain('15 min');
  });

  test('returns behavioral reason when behavioral score is high', () => {
    const reason = generateRecommendationReason({
      recipe: baseRecipe,
      scoreBreakdown: { ...emptyBreakdown, behavioralScore: 80 },
    });
    expect(reason.toLowerCase()).toContain('enjoyed');
  });

  test('returns weekend adventure for non-liked cuisine on weekends', () => {
    const reason = generateRecommendationReason({
      recipe: { ...baseRecipe, cuisine: 'Ethiopian' },
      scoreBreakdown: { ...emptyBreakdown, tasteScore: 70 },
      likedCuisines: ['Thai'],
      isWeekend: true,
    });
    expect(reason).toContain('Ethiopian');
    expect(reason.toLowerCase()).toContain('adventure');
  });

  test('returns generic fallback when no strong signal', () => {
    const reason = generateRecommendationReason({
      recipe: { ...baseRecipe, cookTime: 45 },
      scoreBreakdown: { ...emptyBreakdown },
    });
    expect(reason).toBe('Picked for you by Sazon');
  });

  test('cuisine match beats macro match (higher priority)', () => {
    const reason = generateRecommendationReason({
      recipe: baseRecipe,
      scoreBreakdown: { ...emptyBreakdown, macroScore: 90 },
      likedCuisines: ['Thai'],
    });
    // Cuisine reason (score 90) should beat macro reason (score 65)
    expect(reason).toContain('Thai');
  });

  test('reason is always non-empty string', () => {
    const reason = generateRecommendationReason({
      recipe: { cuisine: '', cookTime: 60, protein: 10, calories: 800 },
      scoreBreakdown: {},
    });
    expect(typeof reason).toBe('string');
    expect(reason.length).toBeGreaterThan(0);
  });
});
