// backend/src/utils/temporalScoring.ts

export interface TemporalContext {
  currentHour: number;
  currentDay: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  currentMonth: number; // 0 = January, 11 = December
  isWeekend: boolean;
  isWeekday: boolean;
  mealPeriod: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  season: 'spring' | 'summer' | 'fall' | 'winter';
}

export interface TemporalScore {
  timeOfDayScore: number;
  dayOfWeekScore: number;
  seasonalScore: number;
  mealPeriodScore: number;
  total: number;
}

export interface UserTemporalPatterns {
  preferredBreakfastTimes: number[];
  preferredLunchTimes: number[];
  preferredDinnerTimes: number[];
  weekdayPreferences: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snack: string[];
  };
  weekendPreferences: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snack: string[];
  };
  seasonalPreferences: {
    spring: string[];
    summer: string[];
    fall: string[];
    winter: string[];
  };
}

export function getCurrentTemporalContext(): TemporalContext {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  const currentMonth = now.getMonth();
  
  const isWeekend = currentDay === 0 || currentDay === 6;
  const isWeekday = !isWeekend;
  
  // Determine meal period based on time
  let mealPeriod: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  if (currentHour >= 6 && currentHour < 11) {
    mealPeriod = 'breakfast';
  } else if (currentHour >= 11 && currentHour < 15) {
    mealPeriod = 'lunch';
  } else if (currentHour >= 15 && currentHour < 21) {
    mealPeriod = 'dinner';
  } else {
    mealPeriod = 'snack';
  }
  
  // Determine season
  let season: 'spring' | 'summer' | 'fall' | 'winter';
  if (currentMonth >= 2 && currentMonth <= 4) {
    season = 'spring';
  } else if (currentMonth >= 5 && currentMonth <= 7) {
    season = 'summer';
  } else if (currentMonth >= 8 && currentMonth <= 10) {
    season = 'fall';
  } else {
    season = 'winter';
  }
  
  return {
    currentHour,
    currentDay,
    currentMonth,
    isWeekend,
    isWeekday,
    mealPeriod,
    season
  };
}

export function calculateTemporalScore(
  recipe: any,
  temporalContext: TemporalContext,
  userPatterns?: UserTemporalPatterns
): TemporalScore {
  const timeOfDayScore = calculateTimeOfDayScore(recipe, temporalContext, userPatterns);
  const dayOfWeekScore = calculateDayOfWeekScore(recipe, temporalContext, userPatterns);
  const seasonalScore = calculateSeasonalScore(recipe, temporalContext, userPatterns);
  const mealPeriodScore = calculateMealPeriodScore(recipe, temporalContext, userPatterns);
  
  const total = Math.round(
    timeOfDayScore * 0.3 +
    dayOfWeekScore * 0.3 +
    seasonalScore * 0.2 +
    mealPeriodScore * 0.2
  );
  
  return {
    timeOfDayScore,
    dayOfWeekScore,
    seasonalScore,
    mealPeriodScore,
    total
  };
}

function calculateTimeOfDayScore(
  recipe: any,
  context: TemporalContext,
  userPatterns?: UserTemporalPatterns
): number {
  const { currentHour, mealPeriod } = context;
  const { cookTime, calories, cuisine } = recipe;
  
  // Base scoring based on time of day
  let score = 50; // Neutral base score
  
  // Breakfast time (6-11 AM)
  if (currentHour >= 6 && currentHour < 11) {
    // Prefer lighter, quicker meals for breakfast
    if (cookTime <= 15) score += 20;
    if (calories <= 400) score += 15;
    if (cuisine === 'American' || cuisine === 'French') score += 10; // Common breakfast cuisines
  }
  
  // Lunch time (11 AM - 3 PM)
  else if (currentHour >= 11 && currentHour < 15) {
    // Prefer moderate meals for lunch
    if (cookTime <= 30) score += 15;
    if (calories >= 300 && calories <= 600) score += 15;
    if (cuisine === 'Mediterranean' || cuisine === 'Asian') score += 10;
  }
  
  // Dinner time (3-9 PM)
  else if (currentHour >= 15 && currentHour < 21) {
    // Prefer more substantial meals for dinner
    if (cookTime >= 20) score += 10; // More time for elaborate cooking
    if (calories >= 400) score += 15;
    if (cuisine === 'Italian' || cuisine === 'Indian' || cuisine === 'Mexican') score += 10;
  }
  
  // Late night/early morning (9 PM - 6 AM)
  else {
    // Prefer lighter, quicker meals
    if (cookTime <= 20) score += 20;
    if (calories <= 300) score += 15;
    if (cuisine === 'Asian' || cuisine === 'American') score += 10;
  }
  
  // Apply user-specific patterns if available
  if (userPatterns) {
    const userPreferredTimes = getUserPreferredTimesForMeal(mealPeriod, userPatterns);
    if (userPreferredTimes.includes(currentHour)) {
      score += 25; // Strong bonus for user's preferred times
    }
  }
  
  return Math.min(100, Math.max(0, score));
}

function calculateDayOfWeekScore(
  recipe: any,
  context: TemporalContext,
  userPatterns?: UserTemporalPatterns
): number {
  const { isWeekend, isWeekday, mealPeriod } = context;
  const { cookTime, cuisine, calories } = recipe;
  
  let score = 50; // Neutral base score
  
  if (isWeekday) {
    // Weekday preferences - faster, simpler meals
    if (cookTime <= 30) score += 20;
    if (cuisine === 'American' || cuisine === 'Asian') score += 10;
    if (calories <= 500) score += 10;
    
    // Apply user weekday preferences
    if (userPatterns) {
      const weekdayPrefs = userPatterns.weekdayPreferences[mealPeriod];
      if (weekdayPrefs.includes(cuisine)) {
        score += 20;
      }
    }
  } else {
    // Weekend preferences - more time for elaborate cooking
    if (cookTime >= 30) score += 15;
    if (cuisine === 'Italian' || cuisine === 'French' || cuisine === 'Indian') score += 15;
    if (calories >= 400) score += 10;
    
    // Apply user weekend preferences
    if (userPatterns) {
      const weekendPrefs = userPatterns.weekendPreferences[mealPeriod];
      if (weekendPrefs.includes(cuisine)) {
        score += 20;
      }
    }
  }
  
  return Math.min(100, Math.max(0, score));
}

function calculateSeasonalScore(
  recipe: any,
  context: TemporalContext,
  userPatterns?: UserTemporalPatterns
): number {
  const { season } = context;
  const { cuisine, calories, cookTime } = recipe;
  
  let score = 50; // Neutral base score
  
  switch (season) {
    case 'spring':
      // Light, fresh meals
      if (cuisine === 'Mediterranean' || cuisine === 'French') score += 15;
      if (calories <= 500) score += 10;
      if (cookTime <= 25) score += 10;
      break;
      
    case 'summer':
      // Light, cooling meals
      if (cuisine === 'Asian' || cuisine === 'Mediterranean') score += 15;
      if (calories <= 400) score += 15;
      if (cookTime <= 20) score += 15; // Quick meals in summer
      break;
      
    case 'fall':
      // Hearty, warming meals
      if (cuisine === 'American' || cuisine === 'Italian') score += 15;
      if (calories >= 400) score += 10;
      if (cookTime >= 25) score += 10; // More time for hearty cooking
      break;
      
    case 'winter':
      // Rich, warming meals
      if (cuisine === 'Indian' || cuisine === 'Italian' || cuisine === 'Mexican') score += 15;
      if (calories >= 500) score += 15;
      if (cookTime >= 30) score += 10; // Comfort food takes time
      break;
  }
  
  // Apply user seasonal preferences
  if (userPatterns) {
    const seasonalPrefs = userPatterns.seasonalPreferences[season];
    if (seasonalPrefs.includes(cuisine)) {
      score += 25;
    }
  }
  
  return Math.min(100, Math.max(0, score));
}

function calculateMealPeriodScore(
  recipe: any,
  context: TemporalContext,
  userPatterns?: UserTemporalPatterns
): number {
  const { mealPeriod } = context;
  const { cookTime, calories, cuisine } = recipe;
  
  let score = 50; // Neutral base score
  
  switch (mealPeriod) {
    case 'breakfast':
      // Quick, light breakfast foods
      if (cookTime <= 15) score += 25;
      if (calories <= 400) score += 20;
      if (cuisine === 'American' || cuisine === 'French') score += 15;
      break;
      
    case 'lunch':
      // Moderate meals
      if (cookTime <= 30) score += 20;
      if (calories >= 300 && calories <= 600) score += 20;
      if (cuisine === 'Mediterranean' || cuisine === 'Asian') score += 15;
      break;
      
    case 'dinner':
      // More substantial meals
      if (cookTime >= 20) score += 15;
      if (calories >= 400) score += 20;
      if (cuisine === 'Italian' || cuisine === 'Indian' || cuisine === 'Mexican') score += 15;
      break;
      
    case 'snack':
      // Quick, light snacks
      if (cookTime <= 10) score += 30;
      if (calories <= 200) score += 25;
      if (cuisine === 'American' || cuisine === 'Asian') score += 10;
      break;
  }
  
  return Math.min(100, Math.max(0, score));
}

function getUserPreferredTimesForMeal(
  mealPeriod: string,
  userPatterns: UserTemporalPatterns
): number[] {
  switch (mealPeriod) {
    case 'breakfast':
      return userPatterns.preferredBreakfastTimes;
    case 'lunch':
      return userPatterns.preferredLunchTimes;
    case 'dinner':
      return userPatterns.preferredDinnerTimes;
    default:
      return [];
  }
}

export function analyzeUserTemporalPatterns(mealHistory: any[]): UserTemporalPatterns {
  // Analyze meal history to determine user's temporal patterns
  const patterns = {
    preferredBreakfastTimes: [] as number[],
    preferredLunchTimes: [] as number[],
    preferredDinnerTimes: [] as number[],
    weekdayPreferences: {
      breakfast: [] as string[],
      lunch: [] as string[],
      dinner: [] as string[],
      snack: [] as string[]
    },
    weekendPreferences: {
      breakfast: [] as string[],
      lunch: [] as string[],
      dinner: [] as string[],
      snack: [] as string[]
    },
    seasonalPreferences: {
      spring: [] as string[],
      summer: [] as string[],
      fall: [] as string[],
      winter: [] as string[]
    }
  };
  
  // Group meals by time of day and day of week
  const breakfastMeals = mealHistory.filter(m => {
    const hour = new Date(m.date).getHours();
    return hour >= 6 && hour < 11;
  });
  
  const lunchMeals = mealHistory.filter(m => {
    const hour = new Date(m.date).getHours();
    return hour >= 11 && hour < 15;
  });
  
  const dinnerMeals = mealHistory.filter(m => {
    const hour = new Date(m.date).getHours();
    return hour >= 15 && hour < 21;
  });
  
  // Extract preferred times
  patterns.preferredBreakfastTimes = [...new Set(breakfastMeals.map(m => new Date(m.date).getHours()))];
  patterns.preferredLunchTimes = [...new Set(lunchMeals.map(m => new Date(m.date).getHours()))];
  patterns.preferredDinnerTimes = [...new Set(dinnerMeals.map(m => new Date(m.date).getHours()))];
  
  // Extract cuisine preferences by day type and meal
  const weekdayMeals = mealHistory.filter(m => {
    const day = new Date(m.date).getDay();
    return day >= 1 && day <= 5;
  });
  
  const weekendMeals = mealHistory.filter(m => {
    const day = new Date(m.date).getDay();
    return day === 0 || day === 6;
  });
  
  // Analyze cuisine preferences
  const weekdayBreakfast = weekdayMeals.filter(m => {
    const hour = new Date(m.date).getHours();
    return hour >= 6 && hour < 11;
  });
  
  const weekdayLunch = weekdayMeals.filter(m => {
    const hour = new Date(m.date).getHours();
    return hour >= 11 && hour < 15;
  });
  
  const weekdayDinner = weekdayMeals.filter(m => {
    const hour = new Date(m.date).getHours();
    return hour >= 15 && hour < 21;
  });
  
  const weekendBreakfast = weekendMeals.filter(m => {
    const hour = new Date(m.date).getHours();
    return hour >= 6 && hour < 11;
  });
  
  const weekendLunch = weekendMeals.filter(m => {
    const hour = new Date(m.date).getHours();
    return hour >= 11 && hour < 15;
  });
  
  const weekendDinner = weekendMeals.filter(m => {
    const hour = new Date(m.date).getHours();
    return hour >= 15 && hour < 21;
  });
  
  // Extract most common cuisines for each category
  patterns.weekdayPreferences.breakfast = getMostCommonCuisines(weekdayBreakfast);
  patterns.weekdayPreferences.lunch = getMostCommonCuisines(weekdayLunch);
  patterns.weekdayPreferences.dinner = getMostCommonCuisines(weekdayDinner);
  patterns.weekendPreferences.breakfast = getMostCommonCuisines(weekendBreakfast);
  patterns.weekendPreferences.lunch = getMostCommonCuisines(weekendLunch);
  patterns.weekendPreferences.dinner = getMostCommonCuisines(weekendDinner);
  
  // Analyze seasonal preferences
  const springMeals = mealHistory.filter(m => {
    const month = new Date(m.date).getMonth();
    return month >= 2 && month <= 4;
  });
  
  const summerMeals = mealHistory.filter(m => {
    const month = new Date(m.date).getMonth();
    return month >= 5 && month <= 7;
  });
  
  const fallMeals = mealHistory.filter(m => {
    const month = new Date(m.date).getMonth();
    return month >= 8 && month <= 10;
  });
  
  const winterMeals = mealHistory.filter(m => {
    const month = new Date(m.date).getMonth();
    return month === 11 || month === 0 || month === 1;
  });
  
  patterns.seasonalPreferences.spring = getMostCommonCuisines(springMeals);
  patterns.seasonalPreferences.summer = getMostCommonCuisines(summerMeals);
  patterns.seasonalPreferences.fall = getMostCommonCuisines(fallMeals);
  patterns.seasonalPreferences.winter = getMostCommonCuisines(winterMeals);
  
  return patterns;
}

function getMostCommonCuisines(meals: any[]): string[] {
  const cuisineCounts = meals.reduce((counts, meal) => {
    const cuisine = meal.recipe?.cuisine || 'Unknown';
    counts[cuisine] = (counts[cuisine] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  return Object.entries(cuisineCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([cuisine]) => cuisine);
}

