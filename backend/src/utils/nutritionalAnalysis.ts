// backend/src/utils/nutritionalAnalysis.ts
// Advanced nutritional analysis - Micronutrients, Omega-3, Antioxidants, ORAC values (Phase 6, Group 12)

export interface MicronutrientData {
  vitamins: {
    vitaminA: number; // IU or mcg
    vitaminC: number; // mg
    vitaminD: number; // IU or mcg
    vitaminE: number; // mg
    vitaminK: number; // mcg
    thiamine: number; // B1, mg
    riboflavin: number; // B2, mg
    niacin: number; // B3, mg
    vitaminB6: number; // mg
    folate: number; // B9, mcg
    vitaminB12: number; // mcg
  };
  minerals: {
    calcium: number; // mg
    iron: number; // mg
    magnesium: number; // mg
    phosphorus: number; // mg
    potassium: number; // mg
    zinc: number; // mg
    copper: number; // mg
    manganese: number; // mg
    selenium: number; // mcg
  };
}

export interface Omega3Data {
  totalOmega3: number; // grams
  epa: number; // Eicosapentaenoic acid, grams
  dha: number; // Docosahexaenoic acid, grams
  ala: number; // Alpha-linolenic acid, grams
  omega3Score: number; // 0-100 based on content and quality
}

export interface AntioxidantData {
  totalAntioxidants: number; // ORAC units (μmol TE/100g)
  oracValue: number; // Oxygen Radical Absorbance Capacity
  polyphenols: number; // mg
  flavonoids: number; // mg
  carotenoids: number; // mg (beta-carotene, lycopene, etc.)
  vitaminC: number; // mg (major antioxidant)
  vitaminE: number; // mg (major antioxidant)
  antioxidantScore: number; // 0-100 based on ORAC value and variety
}

export interface NutritionalAnalysisResult {
  micronutrients: MicronutrientData;
  omega3: Omega3Data;
  antioxidants: AntioxidantData;
  nutritionalDensityScore: number; // 0-100 - overall nutritional richness
  keyNutrients: string[]; // Top nutrients this recipe provides
  nutrientGaps: string[]; // Nutrients that are low or missing
}

/**
 * Analyze recipe for micronutrient content
 * Uses ingredient analysis and known nutrient databases
 */
export function analyzeMicronutrients(recipe: any): MicronutrientData {
  const ingredients = recipe.ingredients || [];
  const allText = [
    ...ingredients.map((i: any) => (i.text || i.name || '').toLowerCase()),
    (recipe.title || '').toLowerCase(),
    (recipe.description || '').toLowerCase(),
  ].join(' ');

  // Initialize micronutrient data
  const micronutrients: MicronutrientData = {
    vitamins: {
      vitaminA: 0,
      vitaminC: 0,
      vitaminD: 0,
      vitaminE: 0,
      vitaminK: 0,
      thiamine: 0,
      riboflavin: 0,
      niacin: 0,
      vitaminB6: 0,
      folate: 0,
      vitaminB12: 0,
    },
    minerals: {
      calcium: 0,
      iron: 0,
      magnesium: 0,
      phosphorus: 0,
      potassium: 0,
      zinc: 0,
      copper: 0,
      manganese: 0,
      selenium: 0,
    },
  };

  // Analyze ingredients for micronutrient content
  // This is a simplified estimation - in production, would use a comprehensive nutrient database
  const ingredientsList = ingredients.map((i: any) => (i.text || i.name || '').toLowerCase());

  // Vitamin C estimation (from fruits and vegetables)
  const vitaminCSources = ['citrus', 'orange', 'lemon', 'lime', 'grapefruit', 'kiwi', 'strawberry', 'bell pepper', 'broccoli', 'tomato', 'spinach', 'kale'];
  const vitaminCCount = ingredientsList.filter((ing: string) => vitaminCSources.some(source => ing.includes(source))).length;
  micronutrients.vitamins.vitaminC = vitaminCCount * 30; // ~30mg per serving of vitamin C source

  // Vitamin A estimation (from orange/yellow vegetables, leafy greens, dairy)
  const vitaminASources = ['carrot', 'sweet potato', 'pumpkin', 'spinach', 'kale', 'milk', 'cheese', 'egg', 'butter'];
  const vitaminACount = ingredientsList.filter((ing: string) => vitaminASources.some(source => ing.includes(source))).length;
  micronutrients.vitamins.vitaminA = vitaminACount * 500; // ~500 IU per serving

  // B Vitamins (from whole grains, meat, legumes, dairy)
  const bVitaminSources = ['whole grain', 'brown rice', 'quinoa', 'chicken', 'beef', 'pork', 'fish', 'bean', 'lentil', 'milk', 'yogurt'];
  const bVitaminCount = ingredientsList.filter((ing: string) => bVitaminSources.some(source => ing.includes(source))).length;
  micronutrients.vitamins.thiamine = bVitaminCount * 0.2; // B1
  micronutrients.vitamins.riboflavin = bVitaminCount * 0.3; // B2
  micronutrients.vitamins.niacin = bVitaminCount * 2.0; // B3
  micronutrients.vitamins.vitaminB6 = bVitaminCount * 0.3;
  micronutrients.vitamins.folate = bVitaminCount * 40; // mcg
  micronutrients.vitamins.vitaminB12 = ingredientsList.some((ing: string) => ['meat', 'fish', 'chicken', 'egg', 'milk'].some(s => ing.includes(s))) ? 2.0 : 0; // mcg

  // Minerals
  // Calcium (dairy, leafy greens, fortified foods)
  const calciumSources = ['milk', 'cheese', 'yogurt', 'spinach', 'kale', 'broccoli', 'tofu', 'almond'];
  const calciumCount = ingredientsList.filter((ing: string) => calciumSources.some(source => ing.includes(source))).length;
  micronutrients.minerals.calcium = calciumCount * 100; // mg

  // Iron (meat, legumes, spinach, fortified grains)
  const ironSources = ['beef', 'chicken', 'pork', 'fish', 'bean', 'lentil', 'spinach', 'fortified'];
  const ironCount = ingredientsList.filter((ing: string) => ironSources.some(source => ing.includes(source))).length;
  micronutrients.minerals.iron = ironCount * 2.0; // mg

  // Potassium (fruits, vegetables, dairy, beans)
  const potassiumSources = ['banana', 'potato', 'sweet potato', 'spinach', 'tomato', 'bean', 'yogurt', 'avocado'];
  const potassiumCount = ingredientsList.filter((ing: string) => potassiumSources.some(source => ing.includes(source))).length;
  micronutrients.minerals.potassium = potassiumCount * 300; // mg

  // Magnesium (nuts, seeds, whole grains, leafy greens)
  const magnesiumSources = ['almond', 'walnut', 'cashew', 'pumpkin seed', 'quinoa', 'spinach', 'black bean'];
  const magnesiumCount = ingredientsList.filter((ing: string) => magnesiumSources.some(source => ing.includes(source))).length;
  micronutrients.minerals.magnesium = magnesiumCount * 50; // mg

  // Zinc (meat, seafood, nuts, seeds)
  const zincSources = ['beef', 'chicken', 'oyster', 'crab', 'almond', 'pumpkin seed', 'lentil'];
  const zincCount = ingredientsList.filter((ing: string) => zincSources.some(source => ing.includes(source))).length;
  micronutrients.minerals.zinc = zincCount * 1.5; // mg

  // Phosphorus (meat, dairy, nuts, legumes)
  const phosphorusSources = ['chicken', 'beef', 'fish', 'milk', 'yogurt', 'almond', 'lentil'];
  const phosphorusCount = ingredientsList.filter((ing: string) => phosphorusSources.some(source => ing.includes(source))).length;
  micronutrients.minerals.phosphorus = phosphorusCount * 100; // mg

  return micronutrients;
}

/**
 * Analyze Omega-3 fatty acid content
 */
export function analyzeOmega3(recipe: any): Omega3Data {
  const ingredients = recipe.ingredients || [];
  const allText = [
    ...ingredients.map((i: any) => (i.text || i.name || '').toLowerCase()),
    (recipe.title || '').toLowerCase(),
  ].join(' ');

  let totalOmega3 = 0;
  let epa = 0;
  let dha = 0;
  let ala = 0;

  // Fish sources (high EPA/DHA)
  const fattyFish = ['salmon', 'mackerel', 'sardine', 'tuna', 'herring', 'anchovy', 'trout'];
  const fishCount = ingredients.filter((i: any) => {
    const text = (i.text || i.name || '').toLowerCase();
    return fattyFish.some(fish => text.includes(fish));
  }).length;

  if (fishCount > 0) {
    // Fatty fish: ~1-2g total omega-3 per serving, with EPA/DHA
    epa = fishCount * 0.4; // grams
    dha = fishCount * 0.6; // grams
    totalOmega3 += epa + dha;
  }

  // Plant sources (ALA)
  const plantSources = ['walnut', 'flaxseed', 'chia seed', 'hemp seed', 'canola oil', 'soybean'];
  const plantCount = ingredients.filter((i: any) => {
    const text = (i.text || i.name || '').toLowerCase();
    return plantSources.some(source => text.includes(source));
  }).length;

  if (plantCount > 0) {
    // Plant sources: ~1-3g ALA per serving
    ala = plantCount * 1.5; // grams
    totalOmega3 += ala;
  }

  // Calculate omega-3 score (0-100)
  // Recommended daily intake: 1.1-1.6g for adults
  // Score based on content and quality (EPA/DHA > ALA)
  let omega3Score = 0;
  if (totalOmega3 > 0) {
    // Base score from total content
    const contentScore = Math.min(100, (totalOmega3 / 2.0) * 100); // 2g = 100 points
    
    // Quality bonus for EPA/DHA (more beneficial than ALA)
    const qualityBonus = (epa + dha) > 0 ? 20 : 0;
    
    omega3Score = Math.min(100, contentScore + qualityBonus);
  }

  return {
    totalOmega3: Math.round(totalOmega3 * 100) / 100,
    epa: Math.round(epa * 100) / 100,
    dha: Math.round(dha * 100) / 100,
    ala: Math.round(ala * 100) / 100,
    omega3Score: Math.round(omega3Score),
  };
}

/**
 * Analyze antioxidant content and ORAC values
 */
export function analyzeAntioxidants(recipe: any): AntioxidantData {
  const ingredients = recipe.ingredients || [];
  const allText = [
    ...ingredients.map((i: any) => (i.text || i.name || '').toLowerCase()),
    (recipe.title || '').toLowerCase(),
  ].join(' ');

  let totalAntioxidants = 0;
  let oracValue = 0;
  let polyphenols = 0;
  let flavonoids = 0;
  let carotenoids = 0;
  let vitaminC = 0;
  let vitaminE = 0;

  // High ORAC foods (ORAC units per 100g)
  const highOracFoods: { [key: string]: number } = {
    'blueberry': 4669,
    'strawberry': 4302,
    'raspberry': 5065,
    'blackberry': 5905,
    'cranberry': 9090,
    'acai': 102700,
    'goji berry': 25300,
    'dark chocolate': 20816,
    'pecan': 17940,
    'artichoke': 9400,
    'kidney bean': 8606,
    'black bean': 8494,
    'prune': 5770,
    'plum': 6259,
    'apple': 3049,
    'red wine': 3607,
    'green tea': 1253,
    'spinach': 1513,
    'broccoli': 1513,
    'kale': 1770,
    'cinnamon': 131420,
    'oregano': 200129,
    'turmeric': 159277,
    'ginger': 28811,
    'garlic': 5708,
    'onion': 1034,
    'tomato': 387,
    'carrot': 697,
  };

  // Check ingredients for high-antioxidant foods
  ingredients.forEach((ing: any) => {
    const text = (ing.text || ing.name || '').toLowerCase();
    
    for (const [food, orac] of Object.entries(highOracFoods)) {
      if (text.includes(food)) {
        // Estimate ORAC contribution (assuming ~100g serving)
        const contribution = orac * 0.1; // Scale down for typical serving
        oracValue += contribution;
        totalAntioxidants += contribution;
        
        // Estimate polyphenols and flavonoids
        if (['berry', 'grape', 'wine', 'tea', 'chocolate'].some(f => text.includes(f))) {
          polyphenols += 50; // mg
          flavonoids += 30; // mg
        }
        
        // Carotenoids (orange/yellow/red foods)
        if (['carrot', 'tomato', 'sweet potato', 'pumpkin', 'paprika', 'red pepper'].some(f => text.includes(f))) {
          carotenoids += 5; // mg
        }
        
        // Vitamin C (antioxidant)
        if (['citrus', 'berry', 'pepper', 'broccoli', 'kale', 'spinach'].some(f => text.includes(f))) {
          vitaminC += 30; // mg
        }
        
        // Vitamin E (antioxidant)
        if (['almond', 'walnut', 'sunflower seed', 'avocado', 'spinach'].some(f => text.includes(f))) {
          vitaminE += 2; // mg
        }
      }
    }
  });

  // Calculate antioxidant score (0-100)
  // High ORAC: >5000, Moderate: 1000-5000, Low: <1000
  let antioxidantScore = 0;
  if (oracValue > 5000) {
    antioxidantScore = 100;
  } else if (oracValue > 2000) {
    antioxidantScore = 75;
  } else if (oracValue > 1000) {
    antioxidantScore = 50;
  } else if (oracValue > 500) {
    antioxidantScore = 30;
  } else if (oracValue > 0) {
    antioxidantScore = 15;
  }

  // Bonus for variety of antioxidants
  const varietyCount = [polyphenols, flavonoids, carotenoids, vitaminC, vitaminE].filter(v => v > 0).length;
  if (varietyCount >= 3) {
    antioxidantScore = Math.min(100, antioxidantScore + 10);
  }

  return {
    totalAntioxidants: Math.round(totalAntioxidants),
    oracValue: Math.round(oracValue),
    polyphenols: Math.round(polyphenols),
    flavonoids: Math.round(flavonoids),
    carotenoids: Math.round(carotenoids),
    vitaminC: Math.round(vitaminC),
    vitaminE: Math.round(vitaminE),
    antioxidantScore: Math.round(antioxidantScore),
  };
}

/**
 * Calculate advanced nutritional density score
 * Goes beyond basic health grade to include micronutrients, omega-3, antioxidants
 */
export function calculateAdvancedNutritionalDensity(
  recipe: any,
  micronutrients: MicronutrientData,
  omega3: Omega3Data,
  antioxidants: AntioxidantData
): number {
  let score = 0;

  // Micronutrient diversity (40 points)
  const vitaminCount = Object.values(micronutrients.vitamins).filter(v => v > 0).length;
  const mineralCount = Object.values(micronutrients.minerals).filter(m => m > 0).length;
  const totalMicronutrients = vitaminCount + mineralCount;
  
  // Score based on micronutrient variety (max 40 points)
  if (totalMicronutrients >= 15) {
    score += 40;
  } else if (totalMicronutrients >= 10) {
    score += 30;
  } else if (totalMicronutrients >= 7) {
    score += 20;
  } else if (totalMicronutrients >= 5) {
    score += 10;
  }

  // Omega-3 content (20 points)
  score += omega3.omega3Score * 0.2;

  // Antioxidant content (20 points)
  score += antioxidants.antioxidantScore * 0.2;

  // Protein efficiency bonus (10 points)
  const proteinEfficiency = recipe.protein && recipe.calories ? (recipe.protein * 4) / recipe.calories : 0;
  if (proteinEfficiency >= 0.20) {
    score += 10;
  } else if (proteinEfficiency >= 0.15) {
    score += 7;
  } else if (proteinEfficiency >= 0.10) {
    score += 4;
  }

  // Fiber bonus (10 points)
  const fiber = recipe.fiber || 0;
  if (fiber >= 5) {
    score += 10;
  } else if (fiber >= 3) {
    score += 7;
  } else if (fiber >= 1) {
    score += 4;
  }

  return Math.min(100, Math.round(score));
}

/**
 * Get key nutrients this recipe provides
 */
export function getKeyNutrients(
  micronutrients: MicronutrientData,
  omega3: Omega3Data,
  antioxidants: AntioxidantData
): string[] {
  const keyNutrients: string[] = [];

  // High vitamin C
  if (micronutrients.vitamins.vitaminC >= 30) {
    keyNutrients.push('Vitamin C');
  }

  // High vitamin A
  if (micronutrients.vitamins.vitaminA >= 500) {
    keyNutrients.push('Vitamin A');
  }

  // High B vitamins
  if (micronutrients.vitamins.folate >= 40 || micronutrients.vitamins.vitaminB12 >= 2) {
    keyNutrients.push('B Vitamins');
  }

  // High calcium
  if (micronutrients.minerals.calcium >= 100) {
    keyNutrients.push('Calcium');
  }

  // High iron
  if (micronutrients.minerals.iron >= 2) {
    keyNutrients.push('Iron');
  }

  // High potassium
  if (micronutrients.minerals.potassium >= 300) {
    keyNutrients.push('Potassium');
  }

  // Omega-3
  if (omega3.totalOmega3 >= 0.5) {
    keyNutrients.push('Omega-3 Fatty Acids');
  }

  // High antioxidants
  if (antioxidants.oracValue >= 1000) {
    keyNutrients.push('Antioxidants');
  }

  return keyNutrients;
}

/**
 * Identify nutrient gaps (nutrients that are low or missing)
 */
export function identifyNutrientGaps(
  micronutrients: MicronutrientData,
  omega3: Omega3Data,
  antioxidants: AntioxidantData
): string[] {
  const gaps: string[] = [];

  // Low vitamin C
  if (micronutrients.vitamins.vitaminC < 15) {
    gaps.push('Vitamin C');
  }

  // Low vitamin A
  if (micronutrients.vitamins.vitaminA < 250) {
    gaps.push('Vitamin A');
  }

  // Low B vitamins
  if (micronutrients.vitamins.folate < 20 && micronutrients.vitamins.vitaminB12 < 1) {
    gaps.push('B Vitamins');
  }

  // Low calcium
  if (micronutrients.minerals.calcium < 50) {
    gaps.push('Calcium');
  }

  // Low iron
  if (micronutrients.minerals.iron < 1) {
    gaps.push('Iron');
  }

  // Low omega-3
  if (omega3.totalOmega3 < 0.1) {
    gaps.push('Omega-3 Fatty Acids');
  }

  // Low antioxidants
  if (antioxidants.oracValue < 500) {
    gaps.push('Antioxidants');
  }

  return gaps;
}

/**
 * Complete nutritional analysis
 */
export function performNutritionalAnalysis(recipe: any): NutritionalAnalysisResult {
  const micronutrients = analyzeMicronutrients(recipe);
  const omega3 = analyzeOmega3(recipe);
  const antioxidants = analyzeAntioxidants(recipe);
  
  const nutritionalDensityScore = calculateAdvancedNutritionalDensity(
    recipe,
    micronutrients,
    omega3,
    antioxidants
  );

  const keyNutrients = getKeyNutrients(micronutrients, omega3, antioxidants);
  const nutrientGaps = identifyNutrientGaps(micronutrients, omega3, antioxidants);

  return {
    micronutrients,
    omega3,
    antioxidants,
    nutritionalDensityScore,
    keyNutrients,
    nutrientGaps,
  };
}

