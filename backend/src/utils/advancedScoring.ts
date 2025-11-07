// backend/src/utils/advancedScoring.ts
// Advanced scoring enhancements for Phase 6, Group 11

/**
 * Enhanced spice level detection and matching
 * Detects spice level from recipe ingredients and instructions
 */
export interface SpiceLevelDetection {
  detectedLevel: 'mild' | 'medium' | 'spicy' | 'very_spicy' | 'unknown';
  confidence: number;
  indicators: string[];
}

/**
 * Detect spice level from recipe ingredients and instructions
 */
export function detectSpiceLevel(recipe: any): SpiceLevelDetection {
  const indicators: string[] = [];
  let spicyScore = 0;
  
  // Combine all text for analysis
  const allText = [
    ...(recipe.ingredients || []).map((i: any) => (i.text || i.name || '').toLowerCase()),
    ...(recipe.instructions || []).map((i: any) => (i.text || i.instruction || '').toLowerCase()),
    (recipe.title || '').toLowerCase(),
    (recipe.description || '').toLowerCase(),
  ].join(' ');

  // Spice indicators - ordered from mild to very spicy
  const spiceIndicators = {
    mild: [
      'black pepper', 'white pepper', 'paprika', 'cumin', 'coriander', 
      'turmeric', 'garlic', 'onion', 'ginger', 'herbs', 'basil', 'oregano'
    ],
    medium: [
      'chili', 'chile', 'jalapeño', 'jalapeno', 'cayenne', 'red pepper flakes',
      'chipotle', 'ancho', 'poblano', 'serrano', 'curry powder', 'harissa'
    ],
    spicy: [
      'habanero', 'scotch bonnet', 'ghost pepper', 'carolina reaper',
      'thai chili', 'bird\'s eye', 'sriracha', 'sambal', 'gochujang',
      'wasabi', 'horseradish', 'szechuan', 'sichuan', 'szechwan pepper'
    ],
    very_spicy: [
      'ghost pepper', 'carolina reaper', 'trinidad scorpion', 'bhut jolokia',
      'extreme heat', 'super hot', 'reaper'
    ]
  };

  // Check for spice indicators
  for (const [level, spices] of Object.entries(spiceIndicators)) {
    for (const spice of spices) {
      if (allText.includes(spice)) {
        indicators.push(spice);
        if (level === 'mild') spicyScore += 1;
        else if (level === 'medium') spicyScore += 3;
        else if (level === 'spicy') spicyScore += 5;
        else if (level === 'very_spicy') spicyScore += 8;
      }
    }
  }

  // Additional context clues
  if (allText.includes('hot') || allText.includes('spicy') || allText.includes('heat')) {
    spicyScore += 2;
  }
  
  // Cuisine-based inference
  const spicyCuisines = ['thai', 'indian', 'mexican', 'szechuan', 'sichuan', 'korean', 'ethiopian'];
  if (spicyCuisines.some(cuisine => recipe.cuisine?.toLowerCase().includes(cuisine))) {
    spicyScore += 2;
  }

  // Determine detected level
  let detectedLevel: 'mild' | 'medium' | 'spicy' | 'very_spicy' | 'unknown';
  if (spicyScore === 0) {
    detectedLevel = 'mild';
  } else if (spicyScore <= 3) {
    detectedLevel = 'mild';
  } else if (spicyScore <= 6) {
    detectedLevel = 'medium';
  } else if (spicyScore <= 10) {
    detectedLevel = 'spicy';
  } else {
    detectedLevel = 'very_spicy';
  }

  const confidence = Math.min(1, spicyScore / 10); // Confidence based on number of indicators

  return {
    detectedLevel,
    confidence,
    indicators: [...new Set(indicators)] // Remove duplicates
  };
}

/**
 * Calculate spice level match score between recipe and user preference
 */
export function calculateSpiceLevelMatch(
  recipe: any,
  userSpiceLevel: string | null | undefined
): number {
  if (!userSpiceLevel) {
    return 50; // Neutral if no preference
  }

  const detection = detectSpiceLevel(recipe);
  const recipeSpice = detection.detectedLevel;

  // Map spice levels to numeric values for comparison
  const spiceValueMap: Record<string, number> = {
    'mild': 1,
    'medium': 2,
    'spicy': 3,
    'very_spicy': 4,
    'unknown': 2 // Default to medium if unknown
  };

  const userValue = spiceValueMap[userSpiceLevel.toLowerCase()] || 2;
  const recipeValue = spiceValueMap[recipeSpice] || 2;

  const difference = Math.abs(userValue - recipeValue);

  // Calculate match score based on difference
  if (difference === 0) {
    return 95; // Perfect match
  } else if (difference === 1) {
    return 75; // Close match (e.g., mild vs medium)
  } else if (difference === 2) {
    return 45; // Moderate mismatch (e.g., mild vs spicy)
  } else {
    return 20; // Large mismatch (e.g., mild vs very spicy)
  }
}

/**
 * Recipe complexity assessment
 * Combines cook time, ingredient count, instruction count, and technique complexity
 */
export interface ComplexityAssessment {
  overallDifficulty: 'easy' | 'medium' | 'hard';
  complexityScore: number;
  factors: {
    cookTime: number;
    ingredientCount: number;
    instructionCount: number;
    techniqueComplexity: number;
  };
}

/**
 * Assess recipe complexity based on multiple factors
 */
export function assessRecipeComplexity(recipe: any): ComplexityAssessment {
  const cookTime = recipe.cookTime || 30;
  const ingredientCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
  const instructionCount = Array.isArray(recipe.instructions) ? recipe.instructions.length : 0;

  // Cook time factor (0-25 points)
  let cookTimeScore = 0;
  if (cookTime <= 15) cookTimeScore = 5;
  else if (cookTime <= 30) cookTimeScore = 10;
  else if (cookTime <= 60) cookTimeScore = 20;
  else cookTimeScore = 25;

  // Ingredient count factor (0-25 points)
  let ingredientScore = 0;
  if (ingredientCount <= 5) ingredientScore = 5;
  else if (ingredientCount <= 10) ingredientScore = 15;
  else if (ingredientCount <= 15) ingredientScore = 20;
  else ingredientScore = 25;

  // Instruction count factor (0-25 points)
  let instructionScore = 0;
  if (instructionCount <= 3) instructionScore = 5;
  else if (instructionCount <= 6) instructionScore = 15;
  else if (instructionCount <= 10) instructionScore = 20;
  else instructionScore = 25;

  // Technique complexity factor (0-25 points)
  // Analyze instructions for complex cooking techniques
  const allInstructions = (recipe.instructions || [])
    .map((i: any) => (i.text || i.instruction || '').toLowerCase())
    .join(' ');

  let techniqueScore = 0;
  const complexTechniques = [
    'braise', 'sous vide', 'temper', 'emulsify', 'brûlée', 'brulée', 'flambé', 'flambe',
    'confit', 'molecular', 'spherification', 'ferment', 'cure', 'smoke', 'sous-vide',
    'reverse sear', 'beer batter', 'tempura', 'phyllo', 'puff pastry', 'laminate'
  ];
  
  const intermediateTechniques = [
    'sauté', 'sautéed', 'sear', 'seared', 'roast', 'roasted', 'braise', 'braised',
    'simmer', 'reduce', 'deglaze', 'marinate', 'rub', 'brine', 'poach', 'steam',
    'blanch', 'julienne', 'brunoise', 'roux', 'roux', 'béchamel', 'bechamel'
  ];

  const complexCount = complexTechniques.filter(tech => allInstructions.includes(tech)).length;
  const intermediateCount = intermediateTechniques.filter(tech => allInstructions.includes(tech)).length;

  if (complexCount > 0) {
    techniqueScore = 20 + (complexCount * 2); // 20-25 for complex techniques
  } else if (intermediateCount > 2) {
    techniqueScore = 10 + (intermediateCount * 2); // 10-20 for multiple intermediate
  } else if (intermediateCount > 0) {
    techniqueScore = 5 + intermediateCount; // 5-10 for some intermediate
  } else {
    techniqueScore = 0; // Basic techniques
  }

  techniqueScore = Math.min(25, techniqueScore);

  // Total complexity score (0-100)
  const complexityScore = cookTimeScore + ingredientScore + instructionScore + techniqueScore;

  // Determine overall difficulty
  let overallDifficulty: 'easy' | 'medium' | 'hard';
  if (complexityScore <= 30) {
    overallDifficulty = 'easy';
  } else if (complexityScore <= 60) {
    overallDifficulty = 'medium';
  } else {
    overallDifficulty = 'hard';
  }

  // Use recipe's difficulty field if available and it's more complex than calculated
  if (recipe.difficulty) {
    const difficultyMap: Record<string, number> = { 'easy': 1, 'medium': 2, 'hard': 3 };
    const difficultyValue = difficultyMap[recipe.difficulty.toLowerCase()] || 2;
    const calculatedValue = difficultyMap[overallDifficulty] || 2;
    if (difficultyValue > calculatedValue) {
      overallDifficulty = recipe.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
    }
  }

  return {
    overallDifficulty,
    complexityScore,
    factors: {
      cookTime: cookTimeScore,
      ingredientCount: ingredientScore,
      instructionCount: instructionScore,
      techniqueComplexity: techniqueScore
    }
  };
}

/**
 * Calculate skill level match score
 * Matches recipe complexity to user's cooking skill level
 */
export function calculateSkillLevelMatch(
  recipe: any,
  userSkillLevel: 'beginner' | 'intermediate' | 'advanced' | undefined
): number {
  if (!userSkillLevel) {
    return 50; // Neutral if no skill level specified
  }

  const complexity = assessRecipeComplexity(recipe);
  const recipeDifficulty = complexity.overallDifficulty;

  const skillValueMap: Record<string, number> = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3
  };

  const difficultyValueMap: Record<string, number> = {
    'easy': 1,
    'medium': 2,
    'hard': 3
  };

  const userValue = skillValueMap[userSkillLevel.toLowerCase()] || 2;
  const recipeValue = difficultyValueMap[recipeDifficulty] || 2;

  const difference = userValue - recipeValue; // Positive = recipe easier, negative = recipe harder

  // Reward recipes that match or are slightly easier than skill level
  if (difference >= 0) {
    // Recipe is easier or matches skill level - good match
    if (difference === 0) {
      return 90; // Perfect match
    } else if (difference === 1) {
      return 80; // Recipe is easier - good for learning
    } else {
      return 70; // Recipe is much easier - acceptable but not ideal
    }
  } else {
    // Recipe is harder than skill level - penalize
    if (difference === -1) {
      return 60; // Slightly harder - challenging but doable
    } else {
      return 30; // Much harder - likely too difficult
    }
  }
}

/**
 * Expanded dietary restriction checking
 * Comprehensive validation for various dietary restrictions
 */
export interface DietaryCompliance {
  isCompliant: boolean;
  violations: string[];
  complianceScore: number;
}

/**
 * Check recipe compliance with dietary restrictions
 */
export function checkDietaryCompliance(
  recipe: any,
  dietaryRestrictions: string[]
): DietaryCompliance {
  if (!dietaryRestrictions || dietaryRestrictions.length === 0) {
    return {
      isCompliant: true,
      violations: [],
      complianceScore: 100
    };
  }

  const violations: string[] = [];
  const allText = [
    ...(recipe.ingredients || []).map((i: any) => (i.text || i.name || '').toLowerCase()),
    ...(recipe.instructions || []).map((i: any) => (i.text || i.instruction || '').toLowerCase()),
    (recipe.title || '').toLowerCase(),
    (recipe.description || '').toLowerCase(),
  ].join(' ');

  // Comprehensive dietary restriction checks
  const restrictionChecks: Record<string, string[]> = {
    'vegetarian': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'seafood', 
                   'meat', 'bacon', 'sausage', 'ham', 'prosciutto', 'anchovy', 'gelatin', 
                   'rennet', 'lard', 'broth', 'stock', 'chicken stock', 'beef stock'],
    'vegan': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'seafood',
              'meat', 'milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream',
              'eggs', 'egg', 'honey', 'gelatin', 'rennet', 'lard', 'whey', 'casein',
              'mayonnaise', 'mayo', 'broth', 'stock', 'chicken stock', 'beef stock'],
    'gluten-free': ['flour', 'wheat', 'barley', 'rye', 'bread', 'pasta', 'noodles',
                    'soy sauce', 'soy sauce', 'beer', 'malt', 'couscous', 'bulgur',
                    'semolina', 'farro', 'spelt', 'seitan'],
    'dairy-free': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream',
                   'whey', 'casein', 'lactose', 'ghee', 'buttermilk'],
    'nut-free': ['peanut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio',
                 'hazelnut', 'macadamia', 'brazil nut', 'pine nut', 'nutella'],
    'shellfish-free': ['shrimp', 'crab', 'lobster', 'crayfish', 'scallop', 'mussel',
                       'clam', 'oyster', 'squid', 'octopus', 'shellfish'],
    'kosher': ['pork', 'shellfish', 'mixing meat and dairy'], // Simplified - full kosher requires more complex rules
    'halal': ['pork', 'alcohol', 'wine', 'beer', 'liquor'], // Simplified
    'paleo': ['grains', 'wheat', 'rice', 'corn', 'beans', 'legumes', 'dairy', 'milk',
              'cheese', 'processed', 'sugar', 'refined'],
    'keto': ['sugar', 'honey', 'maple syrup', 'rice', 'pasta', 'bread', 'potato',
             'carrot', 'corn', 'grains', 'high carb'],
    'low-sodium': ['salt', 'soy sauce', 'sodium', 'brine', 'cured', 'pickled'],
    'low-carb': ['pasta', 'rice', 'bread', 'potato', 'corn', 'high carb', 'sugar']
  };

  // Check each dietary restriction
  for (const restriction of dietaryRestrictions) {
    const restrictionKey = restriction.toLowerCase().replace(/\s+/g, '-');
    const forbiddenItems = restrictionChecks[restrictionKey] || restrictionChecks[restriction.toLowerCase()];

    if (forbiddenItems) {
      for (const item of forbiddenItems) {
        // Use word boundaries to avoid false positives (e.g., "butter" in "butterfly")
        const regex = new RegExp(`\\b${item}\\b`, 'i');
        if (regex.test(allText)) {
          violations.push(`${restriction}: contains ${item}`);
          break; // Only count one violation per restriction
        }
      }
    }
  }

  const complianceScore = violations.length > 0 ? Math.max(0, 100 - (violations.length * 50)) : 100;

  return {
    isCompliant: violations.length === 0,
    violations,
    complianceScore
  };
}

