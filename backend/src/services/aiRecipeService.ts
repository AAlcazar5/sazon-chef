import { logger } from '../utils/logger';
// backend/src/services/aiRecipeService.ts
import { prisma } from '@lib/prisma';
import { imageService } from './imageService';
import { sanitizeUserContent } from './coachSafetyService';
import { AIProviderManager } from './aiProviders/AIProviderManager';
import { getHealthPromptAddendum } from '../utils/cuisineHealthTier';
import { getAdjacentCuisines } from '../utils/cuisineAdjacency';
import { assertCaloriesPerServing } from '../utils/calorieRange';

const SAFE_CUISINE_PATTERN = /^[A-Za-z][A-Za-z '-]{0,63}$/;

export const sanitizeCuisineForPrompt = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > 64) return null;
  if (!SAFE_CUISINE_PATTERN.test(trimmed)) return null;
  return trimmed;
};

export interface RecipeGenerationParams {
  userId: string | null;
  recipeTitle?: string; // Optional: specific recipe title to generate
  userPreferences?: {
    likedCuisines: string[];
    dietaryRestrictions: string[];
    strictDietaryRestrictions?: string[];
    preferToAvoidRestrictions?: string[];
    bannedIngredients: string[];
    preferredSuperfoods?: string[];
    spiceLevel?: string;
    cookTimePreference?: number;
    cookingSkillLevel?: string | null;
    weekdayCookTime?: number | null;
    weekendCookTime?: number | null;
  };
  macroGoals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  physicalProfile?: {
    gender: string;
    age: number;
    activityLevel: string;
    fitnessGoal: string;
  };
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'sauce' | 'any';
  cuisineOverride?: string;
  // Positive diversity steer (e.g. "a slow-braised regional dish, not the
  // iconic one"). Used by the catalog seed to push generation across a
  // cuisine's breadth instead of repeatedly hitting the prototypical dish.
  // Ignored when recipeTitle is set — an explicit dish wins.
  styleHint?: string;
  previousMeals?: Array<{
    title: string;
    cuisine: string;
    mainProtein?: string;
  }>;
  userFeedback?: {
    likedRecipes: Array<{
      title: string;
      cuisine: string;
      ingredients: string[];
      cookTime: number;
    }>;
    dislikedRecipes: Array<{
      title: string;
      cuisine: string;
      ingredients: string[];
      cookTime: number;
    }>;
  };
  maxTotalPrepTime?: number; // Remaining total prep time in minutes for the day
  maxCookTimeForMeal?: number; // Maximum cook time for this specific meal
  maxDailyBudget?: number; // Maximum daily budget in dollars
  remainingBudget?: number; // Remaining budget for the day
  dayDate?: string; // ISO date for this meal's day — used for weekday/weekend cook time awareness
  /**
   * Path A — user subscription tier. Controls which Claude model the
   * provider manager routes to. Defaults to 'free' (Haiku) when omitted
   * so legacy callers / seed scripts keep their cheap behavior.
   */
  tier?: import('./aiProviders/AIProvider').UserTier;
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  cuisine: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'sauce';
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions: Array<{
    step: number;
    instruction: string;
  }>;
  tips?: string[];
  tags?: string[];
  /** Optional representative photo URL — populated post-validation by
   *  Spoonacular lookup for recipe-ask flows (founder 2026-05-20).
   *  Kept for legacy callers; the wedge uses imageUrls (3-photo
   *  collage). */
  imageUrl?: string;
  /** Up to 3 representative photo URLs ranked by title-similarity.
   *  Kitchen-mode parity: the in-chat card renders these as a collage. */
  imageUrls?: string[];
}

export class AIRecipeService {
  private providerManager: AIProviderManager;

  constructor() {
    this.providerManager = new AIProviderManager();
    logger.info({ data: this.providerManager.getAvailableProviders() }, '🤖 [AIRecipeService] Initialized with providers:');
  }

  /**
   * Generate a single AI-powered recipe based on user preferences and macro goals
   * Includes automatic retry logic for safety check failures
   */
  async generateRecipe(params: RecipeGenerationParams, retryCount: number = 0, previousFailures: string[] = []): Promise<GeneratedRecipe> {
    const MAX_RETRIES = 3;
    
    try {
      logger.info({
        userId: params.userId,
        mealType: params.mealType,
        cuisineOverride: params.cuisineOverride,
        retryAttempt: retryCount,
        previousFailures: previousFailures.length,
      }, '🤖 AI Recipe Generation: Starting with params');

      // Path A — route to the right model for this user's tier.
      // Path B — when the route requires PII stripping, build the prompt
      // from the sanitized allow-list so the cheap provider never sees
      // pantry / allergens / macros / cooking history / physical profile.
      const route = this.providerManager.routeToModel('recipe_generation', params.tier ?? 'free');
      const useSanitizedPrompt = route.requiresPiiStripping === true;
      let prompt = useSanitizedPrompt
        ? this.buildSanitizedRecipePrompt(params)
        : this.buildRecipePrompt(params);
      if (previousFailures.length > 0) {
        prompt += `\n\n⚠️ CRITICAL: Previous attempt(s) failed because:\n${previousFailures.map(f => `- ${f}`).join('\n')}\n\nYou MUST create a recipe that does NOT have any of these issues.${useSanitizedPrompt ? '' : ' Double-check all ingredients against banned ingredients list.'}`;
      }

      const systemPrompt = this.getSystemPrompt();

      // Use provider manager with automatic fallback. Forward the route's
      // provider chain so free tier hits Gemini → Claude (Path B) while
      // premium / chef stay on Claude only (Path A).
      const recipe = await this.providerManager.generateRecipe({
        prompt,
        systemPrompt,
        mealType: params.mealType,
        temperature: retryCount > 0 ? 1.2 : 1.1, // Slightly higher temperature on retries for more variation
        maxTokens: 2000,
        model: route.model,
        providerOrder: route.providerOrder,
      });

      logger.info({ data: recipe.title }, '✅ AI Recipe Generated:');
      
      // Validate and normalize the recipe
      const validated = this.validateAndNormalizeRecipe(recipe, params.mealType);

      // Ensure mealType from params is set (override if provided, exclude 'any')
      if (params.mealType && params.mealType !== 'any') {
        validated.mealType = params.mealType;
      }

      // Run safety checks
      try {
        this.performSafetyChecks(validated, params);
      } catch (safetyError: any) {
        // Safety check failed - retry if we haven't exceeded max retries
        const errorMessage = safetyError.message || String(safetyError);
        if (retryCount < MAX_RETRIES) {
          logger.warn({ data: errorMessage }, `⚠️  Safety check failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`);
          
          // Extract specific failure reasons and add to previous failures
          const newFailures = [...previousFailures];
          if (errorMessage.includes('banned ingredients')) {
            const bannedMatch = errorMessage.match(/banned ingredients: ([^;]+)/);
            if (bannedMatch) {
              newFailures.push(`Recipe contained banned ingredients: ${bannedMatch[1]}. You MUST use alternative ingredients that are NOT banned.`);
            } else {
              newFailures.push('Recipe contained banned ingredients. You MUST avoid ALL banned ingredients completely.');
            }
          } else if (errorMessage.includes('vegetarian')) {
            newFailures.push('Recipe contained meat but user requires vegetarian. You MUST use only plant-based ingredients.');
          } else if (errorMessage.includes('vegan')) {
            newFailures.push('Recipe contained animal products but user requires vegan. You MUST use only plant-based ingredients with no animal products.');
          } else if (errorMessage.includes('dairy-free')) {
            newFailures.push('Recipe contained dairy but user requires dairy-free. You MUST use dairy alternatives (e.g., almond milk, coconut milk, vegan cheese).');
          } else {
            newFailures.push(errorMessage);
          }
          
          // Retry with updated context
          logger.info(`🔄 Retrying recipe generation (attempt ${retryCount + 2}/${MAX_RETRIES + 1}) with failure feedback...`);
          return this.generateRecipe(params, retryCount + 1, newFailures);
        } else {
          // Max retries exceeded
          logger.error(`❌ Max retries (${MAX_RETRIES + 1}) exceeded for recipe generation`);
          throw new Error(`Failed to generate recipe after ${MAX_RETRIES + 1} attempts. Last error: ${errorMessage}`);
        }
      }
      
      return validated;
    } catch (error: any) {
      logger.error({ data: error }, '❌ AI Recipe Generation Error:');
      
      // Provider manager already handles quota errors, just preserve them
      if (error.code === 'insufficient_quota' || error.status === 429 || error.isQuotaError) {
        const quotaError: any = new Error(`Failed to generate recipe: ${error.message}`);
        quotaError.code = 'insufficient_quota';
        quotaError.status = 429;
        quotaError.isQuotaError = true;
        throw quotaError;
      }
      
      // If this is a safety check error and we haven't retried yet, retry
      if (error.message && error.message.includes('Recipe failed safety checks') && retryCount < MAX_RETRIES) {
        const errorMessage = error.message;
        logger.warn({ data: errorMessage }, `⚠️  Safety check failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`);
        
        // Extract specific failure reasons
        const newFailures = [...previousFailures];
        if (errorMessage.includes('banned ingredients')) {
          const bannedMatch = errorMessage.match(/banned ingredients: ([^;]+)/);
          if (bannedMatch) {
            newFailures.push(`Recipe contained banned ingredients: ${bannedMatch[1]}. You MUST use alternative ingredients that are NOT banned.`);
          } else {
            newFailures.push('Recipe contained banned ingredients. You MUST avoid ALL banned ingredients completely.');
          }
        } else if (errorMessage.includes('vegetarian')) {
          newFailures.push('Recipe contained meat but user requires vegetarian. You MUST use only plant-based ingredients.');
        } else if (errorMessage.includes('vegan')) {
          newFailures.push('Recipe contained animal products but user requires vegan. You MUST use only plant-based ingredients with no animal products.');
        } else if (errorMessage.includes('dairy-free')) {
          newFailures.push('Recipe contained dairy but user requires dairy-free. You MUST use dairy alternatives (e.g., almond milk, coconut milk, vegan cheese).');
        } else {
          newFailures.push(errorMessage);
        }
        
        // Retry with updated context
        logger.info(`🔄 Retrying recipe generation (attempt ${retryCount + 2}/${MAX_RETRIES + 1}) with failure feedback...`);
        return this.generateRecipe(params, retryCount + 1, newFailures);
      }
      
      throw new Error(`Failed to generate recipe: ${error.message}`);
    }
  }

  /**
   * Generate a structured recipe from a free-text description.
   * Returns for user review — does NOT persist. The user may edit everything
   * before saving through the normal createRecipe flow.
   */
  async generateFromDescription(
    description: string,
    tier: import('./aiProviders/AIProvider').UserTier = 'free',
    options?: {
      /** Founder ask 2026-05-19 — wedge calls ("Grilled chicken") arrive
       *  pre-filtered by detectRecipeAsk (2-5 word food names, no chat
       *  markers, no greetings). The PII argument that forces every
       *  free-text caller onto Claude doesn't apply here: there's no
       *  PII to protect in a constrained food-name query. Setting this
       *  preserves the tier's normal route (free → DeepSeek), at the
       *  cost of a hard 80-char length cap so the bypass can't be
       *  exploited by a long description. */
      mode?: 'recipe-ask';
    },
  ): Promise<GeneratedRecipe> {
    const trimmed = (description || '').trim();
    if (trimmed.length < 3) {
      throw new Error('Description is too short to generate a recipe');
    }
    if (options?.mode === 'recipe-ask' && trimmed.length > 80) {
      throw new Error(
        'Description too long for recipe-ask mode (PII bypass requires a constrained query)',
      );
    }
    if (trimmed.length > 500) {
      throw new Error('Description is too long (max 500 characters)');
    }

    // Tier Y wedge perf (founder Telegram 2026-05-20 Track B): cache
    // recipe-ask generations by normalized description. The wedge is
    // stateless w.r.t. user PII in recipe-ask mode (the 80-char cap +
    // detectRecipeAsk filter ensure that), so a "Grilled chicken"
    // result can be served to any user asking the same query. Cuts
    // DeepSeek calls + 4s latency for repeat asks.
    if (options?.mode === 'recipe-ask') {
      const { aiGenRecipeCache, recipeAskCacheKey } = await import('./aiGenRecipeCache');
      const cacheKey = recipeAskCacheKey(trimmed);
      const cached = aiGenRecipeCache.get<GeneratedRecipe>(cacheKey);
      if (cached) {
        logger.info({ data: cacheKey }, '⚡ [generateFromDescription] cache HIT (recipe-ask)');
        return cached;
      }
    }

    const systemPrompt = this.getSystemPrompt();
    const prompt = `The user described a recipe they made or want to make:

"${trimmed}"

Your task: turn this free-text description into a complete, realistic recipe.
- Infer title, cuisine, cookTime, difficulty, and servings from context (default to 1 serving).
- Pick a mealType that fits (breakfast, lunch, dinner, snack, or dessert).
- Estimate macros accurately from the ingredients the user hinted at. If the user only named a few ingredients, add the minimum supporting items needed to make the recipe work (oil, salt, etc.) but do NOT invent a totally different recipe.
- Write 4-10 clear instruction steps.
- Stay faithful to what the user described. Do not replace their protein, base grain, or key technique.

Return JSON only.`;

    try {
      // Path B guard: free-text descriptions can contain arbitrary user
      // PII (e.g., "my grandma's recipe for my diabetic dad"). The
      // sanitization layer only knows how to strip structured fields,
      // not free-text content. So `generateFromDescription` defaults to
      // bumping free-tier callers to Claude (premium route) — better to
      // pay Haiku than leak free-text PII to a third party.
      //
      // Founder 2026-05-19: the chat wedge bypasses this. detectRecipeAsk
      // already filters to 2-5 word food-name queries (no PII shape) and
      // we enforce an additional 80-char cap above. In that mode the
      // tier's natural route applies (free → DeepSeek).
      const safeTier =
        options?.mode === 'recipe-ask' || tier !== 'free' ? tier : 'premium';
      const route = this.providerManager.routeToModel('recipe_generation', safeTier);
      const recipe = await this.providerManager.generateRecipe({
        prompt,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 2000,
        model: route.model,
        providerOrder: route.providerOrder,
      });
      const rawValidated = this.validateAndNormalizeRecipe(recipe);
      // Tier Y wedge photos (founder 2026-05-20): AI-gen recipes have
      // no image. Look one up on Spoonacular by the validated title
      // (more specific than the original query: "Grilled chicken" →
      // model picks "Simple Grilled Chicken Breast" → that exact title
      // lands a sharper match in Spoonacular). Cached 24h by title.
      // Skipped on non-recipe-ask modes (recipe creation has its own
      // image flow + we don't want to spend Spoonacular points there).
      //
      // Clone before mutating to keep validateAndNormalizeRecipe's
      // return reference immutable (the caller may share that object
      // across retries or cache layers).
      let validated: GeneratedRecipe = rawValidated;
      if (options?.mode === 'recipe-ask' && !rawValidated.imageUrl) {
        try {
          // Kitchen-mode parity (founder 2026-05-20): pull 3 photos so
          // the card renders a collage, not a single hero. Title-Dice
          // ranking inside findRecipeImages filters out fuzzy matches
          // ("Grilled Chicken" → "Chicken Gyro" tacos).
          const imageUrls = await this.lookupImagesForRecipe(
            rawValidated.title,
            3,
            rawValidated.cuisine,
          );
          // Diagnostic for the recurring "still only one image" reports:
          // logs exactly how many photos came back + the title used for
          // lookup. If the count is < 3, Spoonacular returned an
          // under-populated pool; if it's 0, the lookup short-circuited
          // (not-configured, threw, or empty results).
          logger.info(
            {
              data: {
                title: rawValidated.title,
                cuisine: rawValidated.cuisine,
                imageCount: imageUrls.length,
              },
            },
            '🖼️  [generateFromDescription] image lookup result',
          );
          if (imageUrls.length > 0) {
            validated = {
              ...rawValidated,
              imageUrl: imageUrls[0], // primary for legacy callers
              imageUrls,
            };
          }
        } catch (lookupErr: any) {
          // Image lookup must NEVER fail the gen — degrade silently to
          // the frontend's catalog-borrow + cuisine-gradient fallbacks.
          logger.warn(
            { data: lookupErr?.message ?? lookupErr },
            '⚠️  [generateFromDescription] image lookup failed',
          );
        }
      }
      // Tier Y Track B: cache only succeeded + validated recipe-ask
      // generations. Failed validations stay un-cached so a transient
      // bad response doesn't poison the cache. Cached AFTER the image
      // lookup so the cache entry includes the photo (next ask is a
      // pure cache hit with zero Spoonacular point spend).
      if (options?.mode === 'recipe-ask') {
        const { aiGenRecipeCache, recipeAskCacheKey } = await import('./aiGenRecipeCache');
        aiGenRecipeCache.set(recipeAskCacheKey(trimmed), validated);
      }
      return validated;
    } catch (error: any) {
      if (error?.isQuotaError || error?.status === 429) {
        const quotaError: any = new Error(`Failed to generate recipe: ${error.message}`);
        quotaError.code = 'insufficient_quota';
        quotaError.status = 429;
        quotaError.isQuotaError = true;
        throw quotaError;
      }
      throw new Error(`Failed to generate recipe from description: ${error.message || error}`);
    }
  }

  /**
   * Generate multiple recipes for daily meal suggestions
   * @param params - Recipe generation parameters
   * @param options - Optional: specify which meals to generate and custom meal count
   */
  async generateDailyMealPlan(
    params: RecipeGenerationParams,
    options?: {
      mealsToGenerate?: Array<'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'>;
      customMealCount?: number;
      remainingMacros?: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      maxTotalPrepTime?: number; // Maximum total prep time in minutes (default: 60)
      maxDailyBudget?: number; // Maximum daily budget in dollars
      priorDayMeals?: Array<{ title: string; cuisine: string; mainProtein?: string }>;
    }
  ): Promise<{
    breakfast?: GeneratedRecipe;
    lunch?: GeneratedRecipe;
    dinner?: GeneratedRecipe;
    snack?: GeneratedRecipe;
    dessert?: GeneratedRecipe;
  }> {
    try {
      logger.info({ data: params.userId }, '🍽️ AI Daily Meal Plan: Generating for user');
      logger.info({ data: options }, '📋 Options:');

      // Determine which meals to generate
      const mealsToGenerate = options?.mealsToGenerate || ['breakfast', 'lunch', 'dinner', 'snack'];
      const useRemainingMacros = !!options?.remainingMacros;
      
      // Use remaining macros if provided, otherwise use full daily goals
      const targetMacros = useRemainingMacros && options.remainingMacros
        ? options.remainingMacros
        : params.macroGoals || { calories: 2000, protein: 150, carbs: 200, fat: 67 };

      // Distribute macros across meals
      let mealDistribution: Record<string, number> = {};
      
      if (options?.customMealCount && options.customMealCount > 0 && useRemainingMacros) {
        // Custom meal count: distribute evenly across specified meals
        const mealPortion = 1 / options.customMealCount;
        mealsToGenerate.forEach(mealType => {
          mealDistribution[mealType] = mealPortion;
        });
      } else {
        // Standard distribution
        const standardDistribution: Record<string, number> = {
          breakfast: 0.25, // 25%
          lunch: 0.30,     // 30%
          dinner: 0.35,    // 35%
          snack: 0.10,     // 10%
          dessert: 0.08,   // 8% (desserts are typically smaller)
        };
        
        // Normalize distribution for selected meals only
        const totalStandard = mealsToGenerate.reduce((sum, meal) => sum + (standardDistribution[meal] || 0.1), 0);
        mealsToGenerate.forEach(mealType => {
          mealDistribution[mealType] = (standardDistribution[mealType] || 0.1) / totalStandard;
        });
      }

      logger.info({ data: mealDistribution }, '📊 Meal distribution:');

    // Generate recipes SEQUENTIALLY to enforce variation
    // Each meal knows about the previous ones to avoid repetition
    const result: {
      breakfast?: GeneratedRecipe;
      lunch?: GeneratedRecipe;
      dinner?: GeneratedRecipe;
      snack?: GeneratedRecipe;
      dessert?: GeneratedRecipe;
    } = {};

    const previousMeals: Array<{ title: string; cuisine: string; mainProtein?: string }> =
      options?.priorDayMeals ? [...options.priorDayMeals] : [];
    
    // Track total prep time to keep under maxTotalPrepTime (default 60 minutes)
    const maxTotalPrepTime = options?.maxTotalPrepTime || 60;
    let totalPrepTime = 0;
    logger.info(`⏱️  Total prep time constraint: ${maxTotalPrepTime} minutes`);
    
    // Track total budget to keep under maxDailyBudget if provided
    const maxDailyBudget = options?.maxDailyBudget;
    let totalBudget = 0;
    if (maxDailyBudget) {
      logger.info(`💰 Daily budget constraint: $${maxDailyBudget}`);
    }

    for (const mealType of mealsToGenerate) {
      const portion = mealDistribution[mealType] || (1 / mealsToGenerate.length);
      
      logger.info(`🔄 Generating ${mealType}... (previous meals: ${previousMeals.length})`);
      
      // Retry logic for Claude JSON parsing issues
      let recipe: GeneratedRecipe | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const mealMacros = {
            calories: Math.round(targetMacros.calories * portion),
            protein: Math.round(targetMacros.protein * portion),
            carbs: Math.round(targetMacros.carbs * portion),
            fat: Math.round(targetMacros.fat * portion),
          };
          
          logger.info({ data: mealMacros }, `📊 Target macros for ${mealType}:`);
          
          // Calculate remaining prep time for this meal
          const remainingPrepTime = maxTotalPrepTime - totalPrepTime;
          const mealsRemaining = mealsToGenerate.length - Object.keys(result).length;
          const maxCookTimeForMeal = Math.max(10, Math.floor(remainingPrepTime / mealsRemaining));
          
          // Calculate remaining budget for this meal
          const remainingBudget = maxDailyBudget ? maxDailyBudget - totalBudget : undefined;
          const avgBudgetPerMeal = maxDailyBudget && mealsRemaining > 0 
            ? (remainingBudget || 0) / mealsRemaining 
            : undefined;
          
          logger.info(`⏱️  Prep time: ${totalPrepTime}/${maxTotalPrepTime} min used, ${remainingPrepTime} min remaining`);
          logger.info(`⏱️  Max cook time for ${mealType}: ${maxCookTimeForMeal} min (${mealsRemaining} meals remaining)`);
          if (maxDailyBudget) {
            logger.info(`💰 Budget: $${totalBudget.toFixed(2)}/$${maxDailyBudget.toFixed(2)} used, $${remainingBudget?.toFixed(2)} remaining`);
            logger.info(`💰 Avg budget per remaining meal: $${avgBudgetPerMeal?.toFixed(2)}`);
          }
          
          recipe = await this.generateRecipe({
            ...params,
            mealType,
            macroGoals: mealMacros,
            previousMeals: previousMeals.length > 0 ? previousMeals : undefined,
            maxTotalPrepTime: remainingPrepTime, // Pass remaining time as constraint
            maxCookTimeForMeal, // Pass calculated max cook time for this meal
            maxDailyBudget: maxDailyBudget, // Pass daily budget constraint
            remainingBudget: remainingBudget, // Pass remaining budget
          });
          break; // Success, exit retry loop
        } catch (error: any) {
          attempts++;
          const isJsonError = error.message?.includes('JSON') || error.message?.includes('parse');
          
          if (isJsonError && attempts < maxAttempts) {
            logger.warn(`⚠️  [${mealType}] JSON parsing error (attempt ${attempts}/${maxAttempts}), retrying...`);
            // Short delay before retry (500ms instead of exponential backoff for speed)
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            // Not a JSON error, or max attempts reached
            throw error;
          }
        }
      }
      
      if (!recipe) {
        throw new Error(`Failed to generate ${mealType} after ${maxAttempts} attempts`);
      }

      result[mealType] = recipe;
      
      // Update total prep time
      totalPrepTime += recipe.cookTime || 0;
      logger.info(`⏱️  Added ${recipe.cookTime} min, total prep time: ${totalPrepTime}/${maxTotalPrepTime} min`);
      
      // Note: Budget tracking would require cost estimation from ingredients
      // For now, we rely on AI prompt instructions to keep costs reasonable
      // Future enhancement: estimate cost from ingredients and track actual budget
      
      // Track this meal for next iterations
      previousMeals.push({
        title: recipe.title,
        cuisine: recipe.cuisine,
        mainProtein: this.extractMainProtein(recipe),
      });
      
      logger.info(`✅ ${mealType} generated: ${recipe.title} (${recipe.cuisine}, ${recipe.cookTime} min)`);
    }

      logger.info('✅ AI Daily Meal Plan: Complete');
      logger.info({ data: mealsToGenerate }, '📦 Generated meals:');

      return result;
    } catch (error: any) {
      logger.error({ data: error }, '❌ AI Daily Meal Plan Error:');
      
      // Preserve quota errors from generateRecipe
      if (error.code === 'insufficient_quota' || error.status === 429) {
        const quotaError: any = new Error(`Failed to generate daily meal plan: ${error.message}`);
        quotaError.code = 'insufficient_quota';
        quotaError.status = 429;
        throw quotaError;
      }
      
      throw new Error(`Failed to generate daily meal plan: ${error.message}`);
    }
  }

  /**
   * Build the recipe generation prompt
   */

  /**
   * Tier Y wedge photos (founder 2026-05-20): consult the recipe-image
   * cache first; on miss, call Spoonacular's `complexSearch` and cache
   * the result. Returns up to `count` image URLs ranked by title-Dice
   * similarity (the local rank prevents fuzzy Spoonacular matches like
   * "Grilled Chicken" → tacos).
   *
   * Always-resolves (never throws) — the caller wraps in try/catch
   * defensively, but the contract is: degrade to [] on any failure so
   * the gen path can't be broken by an image-service hiccup.
   */
  private async lookupImagesForRecipe(
    title: string,
    count: number = 3,
    cuisine?: string,
  ): Promise<string[]> {
    const trimmed = (title || '').trim();
    if (!trimmed) return [];
    const { recipeImageCache, recipeImageCacheKey } = await import('./recipeImageCache');
    // Cache key includes cuisine — different cuisines warrant different
    // photo pools even for the same title (e.g., a Mediterranean
    // "Chicken Bowl" vs. an Indian "Chicken Bowl").
    const cacheKey = recipeImageCacheKey(`${trimmed}::${cuisine ?? ''}::n${count}`);
    const cached = recipeImageCache.get<string[]>(cacheKey);
    if (cached) {
      logger.info({ data: cacheKey }, '⚡ [lookupImagesForRecipe] cache HIT');
      return cached;
    }
    try {
      const { spoonacularService } = await import('./spoonacularService');
      if (!spoonacularService.isConfigured()) return [];
      const imageUrls = await spoonacularService.findRecipeImages(
        trimmed,
        count,
        cuisine,
      );
      if (imageUrls.length > 0) {
        recipeImageCache.set(cacheKey, imageUrls);
        return imageUrls;
      }
    } catch (err: any) {
      logger.warn(
        { data: err?.message ?? err },
        '⚠️  [lookupImagesForRecipe] spoonacular error',
      );
    }
    return [];
  }

  /**
   * Positive diversity steer, shared by both prompt builders so the wording
   * can't drift between Path A and Path B. Empty when not applicable
   * (no styleHint, or an explicit recipeTitle that must win).
   */
  private styleHintLine(params: RecipeGenerationParams): string {
    if (!params.styleHint || params.recipeTitle) return '';
    return `Make this specifically ${params.styleHint}. Do NOT default to the single most iconic/obvious dish — explore the breadth of this cuisine.`;
  }

  /**
   * Path B — PII-stripped recipe prompt for cheap-tier providers.
   *
   * Builds the SAME user-facing recipe-generation prompt as
   * `buildRecipePrompt`, but using ONLY non-PII fields. Allowed:
   *
   *   - recipeTitle           (explicit dish, not a user attribute)
   *   - mealType              (breakfast / lunch / dinner / snack / dessert)
   *   - cuisineOverride       (cuisine name)
   *   - styleHint             (catalog-seed diversity steer, no user identity)
   *   - maxCookTimeForMeal    (numeric duration cap)
   *
   * Explicitly NOT used:
   *
   *   - userPreferences (cuisines / dietary restrictions / banned ingredients)
   *   - macroGoals, physicalProfile (age, gender, weight, activity, fitness goal)
   *   - previousMeals / userFeedback (cooking history)
   *   - maxDailyBudget / remainingBudget (financial)
   *   - userId, dayDate (identifying)
   *
   * If a route flags `requiresPiiStripping`, callers MUST use this builder
   * — sending `buildRecipePrompt` output to a non-Anthropic provider is a
   * privacy posture violation per ROADMAP_TO_LAUNCH.md Tier V.
   */
  buildSanitizedRecipePrompt(params: RecipeGenerationParams): string {
    const parts: string[] = [];

    if (params.recipeTitle) {
      parts.push(
        `Create a recipe for: "${sanitizeUserContent(params.recipeTitle)}"`,
        '',
        'Generate a complete, detailed recipe for this dish. Include all ingredients, step-by-step instructions, and accurate nutrition information.',
        '',
      );
    }

    if (params.mealType && params.mealType !== 'any') {
      if (params.recipeTitle) {
        parts.push(`This is a ${params.mealType} recipe.`);
      } else if (params.mealType === 'dessert') {
        parts.push('Generate a dessert recipe (sweet treats like cakes, cookies, pies, ice cream, etc.).');
      } else if (params.mealType === 'snack') {
        parts.push('Generate a healthy snack recipe (light, nutritious options suitable for between meals — NOT desserts).');
      } else if (params.mealType === 'sauce') {
        parts.push('Generate a sauce, condiment, dressing, or dip recipe (e.g., tzatziki, chimichurri, harissa) — a flavor accompaniment, NOT a standalone meal.');
      } else {
        parts.push(`Generate a ${params.mealType} recipe.`);
      }
    } else if (!params.recipeTitle) {
      parts.push('Generate a delicious recipe.');
    }

    if (params.cuisineOverride && params.cuisineOverride.trim().length > 0) {
      const safe = sanitizeCuisineForPrompt(params.cuisineOverride);
      if (safe) parts.push(`Cuisine: ${safe}.`);
    }

    const sanitizedHint = this.styleHintLine(params);
    if (sanitizedHint) parts.push(sanitizedHint);

    if (typeof params.maxCookTimeForMeal === 'number' && params.maxCookTimeForMeal > 0) {
      parts.push(`Total cook time must not exceed ${params.maxCookTimeForMeal} minutes.`);
    }

    parts.push('Return JSON only — title, description, cuisine, cookTime, difficulty, servings, ingredients[], instructions[], nutrition (calories, protein, carbs, fat).');

    return parts.join('\n');
  }

  private buildRecipePrompt(params: RecipeGenerationParams): string {
    const parts: string[] = [];

    // If recipe title is provided, use it as the primary instruction
    if (params.recipeTitle) {
      parts.push(
        `Create a recipe for: "${sanitizeUserContent(params.recipeTitle)}"`,
        ``,
        `Generate a complete, detailed recipe for this dish. Include all ingredients, step-by-step instructions, and accurate nutrition information.`,
        ``
      );
    }

    // Meal type
    if (params.mealType && params.mealType !== 'any') {
      if (params.recipeTitle) {
        parts.push(`This is a ${params.mealType} recipe.`);
      } else {
        if (params.mealType === 'dessert') {
          parts.push(`Generate a dessert recipe (sweet treats like cakes, cookies, pies, ice cream, etc.).`);
        } else if (params.mealType === 'snack') {
          parts.push(`Generate a healthy snack recipe (light, nutritious options suitable for between meals - NOT desserts). Examples: yogurt with fruit, cheese and crackers, protein bars, trail mix, etc.`);
        } else if (params.mealType === 'sauce') {
          parts.push(`Generate a sauce, condiment, dressing, or dip recipe (a flavor accompaniment, NOT a standalone meal). Examples: tzatziki, chimichurri, harissa, romesco, nuoc cham, tahini sauce, etc.`);
        } else {
          parts.push(`Generate a ${params.mealType} recipe.`);
        }
      }
    } else if (!params.recipeTitle) {
      parts.push('Generate a delicious recipe.');
    }

    // POSITIVE DIVERSITY AXIS: steer toward an under-explored part of the
    // cuisine instead of the prototypical dish (catalog seed uses this).
    const fullHint = this.styleHintLine(params);
    if (fullHint) parts.push(fullHint);

    // VARIATION ENFORCEMENT: Avoid repeating previous meals
    if (params.previousMeals && params.previousMeals.length > 0) {
      parts.push(`\nIMPORTANT - ENSURE VARIETY: You have already generated these meals today:`);
      params.previousMeals.forEach((meal, idx) => {
        parts.push(`  ${idx + 1}. ${sanitizeUserContent(meal.title)} (${meal.cuisine} cuisine${meal.mainProtein ? ', ' + meal.mainProtein : ''})`);
      });
      parts.push(`\nThe NEW recipe MUST be completely different:`);
      parts.push(`- Use a DIFFERENT cuisine than: ${[...new Set(params.previousMeals.map(m => m.cuisine))].join(', ')}`);
      parts.push(`- Use a DIFFERENT main protein/ingredient than: ${[...new Set(params.previousMeals.map(m => m.mainProtein).filter(Boolean))].join(', ')}`);
      parts.push(`- Create a recipe with DIFFERENT flavors, preparation method, and style`);
      parts.push(`- NEVER repeat ingredients like "quinoa" if used multiple times already`);
    }

    // USER FEEDBACK INTEGRATION: Learn from liked/disliked recipes
    if (params.userFeedback) {
      const { likedRecipes, dislikedRecipes } = params.userFeedback;
      
      if (likedRecipes.length > 0) {
        parts.push(`\n✅ USER PREFERENCE LEARNING: The user has LIKED these recipes:`);
        likedRecipes.slice(0, 5).forEach((recipe, idx) => {
          parts.push(`  ${idx + 1}. ${recipe.title} (${recipe.cuisine} cuisine, ${recipe.cookTime} min)`);
          // Extract common ingredients (first 3-5 ingredients are usually main ingredients)
          const mainIngredients = recipe.ingredients.slice(0, 5).join(', ');
          if (mainIngredients) {
            parts.push(`     Key ingredients: ${mainIngredients}`);
          }
        });
        parts.push(`\nINFLUENCE: Try to incorporate similar ingredients, cuisines, or cooking styles that the user enjoys.`);
      }
      
      if (dislikedRecipes.length > 0) {
        parts.push(`\n❌ USER AVOIDANCE LEARNING: The user has DISLIKED these recipes:`);
        dislikedRecipes.slice(0, 5).forEach((recipe, idx) => {
          parts.push(`  ${idx + 1}. ${recipe.title} (${recipe.cuisine} cuisine, ${recipe.cookTime} min)`);
        });
        
        // Extract commonly disliked ingredients
        const dislikedIngredients: string[] = [];
        dislikedRecipes.forEach(recipe => {
          recipe.ingredients.forEach(ing => {
            const normalized = ing.toLowerCase().trim();
            if (normalized.length > 3 && !dislikedIngredients.includes(normalized)) {
              dislikedIngredients.push(normalized);
            }
          });
        });
        
        if (dislikedIngredients.length > 0) {
          parts.push(`\nAVOID using these ingredients/patterns: ${dislikedIngredients.slice(0, 10).join(', ')}`);
          parts.push(`Try to create a recipe that avoids these disliked elements.`);
        }
        
        // Avoid disliked cuisines if user has strong preference
        const dislikedCuisines = [...new Set(dislikedRecipes.map(r => r.cuisine))];
        if (dislikedCuisines.length > 0 && dislikedRecipes.length >= 3) {
          parts.push(`\nNOTE: User has disliked multiple ${dislikedCuisines.join(' and ')} recipes. Consider a different cuisine unless specifically requested.`);
        }
      }
    }

    // Sanitize cuisineOverride before any prompt interpolation to defeat
    // prompt-injection via the user-supplied `cuisine` query param. Cuisine
    // names are short alphabetic strings; anything else gets dropped.
    const safeCuisine = sanitizeCuisineForPrompt(params.cuisineOverride);

    // Cuisine preference
    if (safeCuisine) {
      parts.push(`The recipe must be ${safeCuisine} cuisine.`);
    } else if (params.userPreferences?.likedCuisines && params.userPreferences.likedCuisines.length > 0) {
      parts.push(
        `Choose from these cuisines: ${params.userPreferences.likedCuisines.join(', ')}.`
      );
    }

    // Group 11 Phase 3 — health-tier addendum (cuisine-specific generation strategy)
    if (safeCuisine) {
      const healthAddendum = getHealthPromptAddendum(safeCuisine);
      if (healthAddendum) {
        parts.push(healthAddendum);
      }
    }

    // Group 11 Phase 1 — cuisine adjacency hints (top-3 related cuisines by weight)
    if (safeCuisine) {
      const adjacent = getAdjacentCuisines(safeCuisine)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .map((edge) => edge.cuisine);
      if (adjacent.length > 0) {
        parts.push(`Also consider influences from ${adjacent.join(', ')}.`);
      }
    }

    // Macro goals (CRITICAL for macro-friendly app)
    if (params.macroGoals) {
      // For smaller meals (under 600 cal), use tighter tolerances
      const isSmallMeal = params.macroGoals.calories < 600;
      const calTolerance = isSmallMeal ? 30 : 50;
      const proteinTolerance = isSmallMeal ? 3 : 5;
      const carbsTolerance = isSmallMeal ? 5 : 10;
      const fatTolerance = isSmallMeal ? 3 : 5;
      
      parts.push(
        `CRITICAL REQUIREMENT: This recipe MUST match these EXACT nutritional targets (per serving):`,
        `- Total Calories: ${params.macroGoals.calories} kcal (within ±${calTolerance} kcal)`,
        `- Protein: ${params.macroGoals.protein}g (within ±${proteinTolerance}g)`,
        `- Carbohydrates: ${params.macroGoals.carbs}g (within ±${carbsTolerance}g)`,
        `- Fat: ${params.macroGoals.fat}g (within ±${fatTolerance}g)`,
        ``,
        `THESE ARE NOT DAILY TOTALS - this is for ONE MEAL/RECIPE with ONE SERVING.`,
        `DO NOT generate a recipe with ${params.macroGoals.calories * 4} or ${params.macroGoals.calories * 2} calories.`,
        `Generate a recipe with EXACTLY ${params.macroGoals.calories} calories (±${calTolerance}).`
      );
    }

    // Fiber target — fiber is treated as a 5th macro
    const fiberTarget = params.macroGoals
      ? Math.round(params.macroGoals.calories / 250) // ~8g per 2000cal meal day, scaled per meal
      : 8;
    parts.push(
      `FIBER TARGET: Aim for at least ${fiberTarget}g of fiber per serving. Prioritize legumes, whole grains, vegetables, and fruit as primary fiber sources. Include the "fiber" field in your JSON response.`
    );

    // ============================================
    // INGREDIENT PREFERENCES SECTION
    // This section is dynamically updated from user preferences
    // Updated when user completes onboarding or updates preferences
    // ============================================
    
    // Dietary restrictions — strict vs prefer_avoid
    const strictRestrictions = params.userPreferences?.strictDietaryRestrictions || params.userPreferences?.dietaryRestrictions || [];
    const preferToAvoid = params.userPreferences?.preferToAvoidRestrictions || [];
    if (strictRestrictions.length > 0) {
      parts.push(
        ``,
        `STRICT DIETARY RESTRICTIONS (from user profile):`,
        `The recipe MUST comply with: ${strictRestrictions.join(', ')}.`,
        `Do NOT include any ingredients that violate these restrictions.`
      );
    }
    if (preferToAvoid.length > 0) {
      parts.push(
        ``,
        `DIETARY PREFERENCES (prefer to avoid):`,
        `Try to avoid these if possible, but they are not strict requirements: ${preferToAvoid.join(', ')}.`,
        `If used, note them in the recipe description.`
      );
    }

    // Banned ingredients - CRITICAL: Must be strictly avoided
    if (params.userPreferences?.bannedIngredients && params.userPreferences.bannedIngredients.length > 0) {
      const bannedList = params.userPreferences.bannedIngredients.map(ing => `- ${ing}`).join('\n');
      parts.push(
        ``,
        `🚫 BANNED INGREDIENTS (from user preferences - NEVER USE THESE):`,
        bannedList,
        ``,
        `CRITICAL: You MUST NOT use any of these ingredients in any form.`,
        `Check every ingredient name carefully - avoid even partial matches (e.g., if "bell peppers" is banned, do not use "red bell peppers", "green peppers", or "peppers").`,
        `If a recipe typically requires a banned ingredient, you MUST substitute it with a suitable alternative.`
      );
    }

    // Preferred superfoods - prioritize recipes with these ingredients
    if (params.userPreferences?.preferredSuperfoods && params.userPreferences.preferredSuperfoods.length > 0) {
      // Map category IDs to friendly names for the AI prompt
      const superfoodNames = params.userPreferences.preferredSuperfoods.map(category => {
        const mapping: Record<string, string> = {
          'beans': 'beans (black beans, kidney beans, chickpeas, lentils)',
          'oliveOil': 'olive oil',
          'fermented': 'fermented foods (kimchi, sauerkraut, yogurt, miso)',
          'ginger': 'ginger',
          'turmeric': 'turmeric',
          'cod': 'cod fish',
          'sardines': 'sardines',
          'salmon': 'salmon',
          'mackerel': 'mackerel',
          'herring': 'herring',
          'blueberries': 'blueberries',
          'strawberries': 'strawberries',
          'raspberries': 'raspberries',
          'blackberries': 'blackberries',
          'spinach': 'spinach',
          'kale': 'kale',
          'arugula': 'arugula',
          'almonds': 'almonds',
          'walnuts': 'walnuts',
          'chiaSeeds': 'chia seeds',
          'flaxSeeds': 'flax seeds',
          'quinoa': 'quinoa',
          'oats': 'oats',
          'brownRice': 'brown rice',
          'avocado': 'avocado',
          'sweetPotato': 'sweet potatoes',
          'broccoli': 'broccoli',
          'garlic': 'garlic',
        };
        return mapping[category] || category;
      });

      const preferredList = superfoodNames.map(sf => `- ${sf}`).join('\n');
      parts.push(
        ``,
        `⭐ PREFERRED INGREDIENTS (from user preferences - PRIORITIZE THESE):`,
        preferredList,
        ``,
        `PRIORITY: The user wants to see more recipes containing these superfoods.`,
        `Try to incorporate at least one or more of these ingredients into the recipe when possible.`,
        `These ingredients should be featured prominently in the recipe when it makes sense.`
      );
    }

    // Cook time preference
    if (params.maxCookTimeForMeal) {
      // Use the calculated max cook time for this meal (based on remaining total prep time)
      parts.push(
        `CRITICAL: Cook time MUST be ${params.maxCookTimeForMeal} minutes or less. This is part of a daily meal plan with limited total prep time.`
      );
    } else {
      // Time-aware slot constraints: use weekday/weekend specific cook times when available
      const prefs = params.userPreferences;
      const dayOfWeek = params.dayDate ? new Date(params.dayDate).getDay() : null;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const daySpecificTime = prefs
        ? (isWeekend ? prefs.weekendCookTime : prefs.weekdayCookTime)
        : null;

      if (daySpecificTime) {
        parts.push(
          `Cook time should be under ${daySpecificTime} minutes. ${isWeekend ? 'This is a weekend slot — user has more time.' : 'This is a weekday slot — keep it quick.'}`
        );
      } else if (prefs?.cookTimePreference) {
        parts.push(
          `Cook time should be under ${prefs.cookTimePreference} minutes.`
        );
      }
    }
    
    // Total prep time constraint
    if (params.maxTotalPrepTime) {
      parts.push(
        `IMPORTANT: This meal is part of a daily meal plan. Keep cook time reasonable to stay within the daily prep time budget of ${params.maxTotalPrepTime} minutes total.`
      );
    }
    
    // Daily budget constraint
    if (params.maxDailyBudget) {
      const budgetInfo = params.remainingBudget !== undefined
        ? `Remaining budget: $${params.remainingBudget.toFixed(2)} out of $${params.maxDailyBudget.toFixed(2)} daily budget.`
        : `Daily budget limit: $${params.maxDailyBudget.toFixed(2)}.`;
      parts.push(
        `BUDGET CONSTRAINT: ${budgetInfo} Keep ingredient costs reasonable. Prefer affordable, common ingredients. Avoid expensive specialty items, premium cuts of meat, or exotic ingredients unless necessary. Aim for cost-effective recipes that stay within budget.`
      );
    }

    // Spice level
    if (params.userPreferences?.spiceLevel) {
      parts.push(`Spice level: ${params.userPreferences.spiceLevel}.`);
    }

    // Fitness goal context
    if (params.physicalProfile?.fitnessGoal) {
      const goalContext = this.getFitnessGoalContext(params.physicalProfile.fitnessGoal);
      parts.push(goalContext);
    }

    // Quality requirements (concise for faster generation)
    parts.push(
      '\nRequirements: Creative, unique, delicious, easy-to-follow. Vary proteins (chicken/beef/fish/tofu/legumes).'
    );

    return parts.join('\n');
  }

  /**
   * System prompt for consistent recipe generation (optimized for speed)
   */
  private getSystemPrompt(): string {
    return `Expert chef & nutritionist creating macro-friendly recipes.

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no extra text.
Use double quotes for all strings. No trailing commas. Properly close all braces/brackets.

Response format (JSON only):
{
  "title": "Recipe Name",
  "description": "Brief description (1-2 sentences)",
  "cuisine": "Italian/Mexican/etc",
  "cookTime": 30,
  "difficulty": "easy/medium/hard",
  "servings": 1,
  "calories": 450, "protein": 35, "carbs": 40, "fat": 15, "fiber": 8,
  "ingredients": [{"name": "Ingredient", "amount": 150, "unit": "g"}],
  "instructions": [{"step": 1, "instruction": "Step text"}],
  "tips": ["Tip 1"], "tags": ["high-protein"]
}

Rules: Accurate macros, clear steps, delicious taste, match nutrition targets (±50 kcal, ±5g protein, ±10g carbs, ±5g fat).`;
  }

  /**
   * Get context based on fitness goal
   */
  private getFitnessGoalContext(fitnessGoal: string): string {
    switch (fitnessGoal) {
      case 'lose_weight':
        return 'Focus on high satiety, lower calorie density, and high protein to preserve muscle.';
      case 'gain_muscle':
        return 'Emphasize high protein content and nutrient-dense foods to support muscle growth.';
      case 'athletic':
        return 'Balance carbs for energy with protein for recovery. Include performance-supporting nutrients.';
      case 'maintain':
      default:
        return 'Create a balanced, sustainable recipe for maintenance and overall health.';
    }
  }

  /**
   * Comprehensive recipe validation and normalization
   */
  private validateAndNormalizeRecipe(
    recipe: GeneratedRecipe,
    intendedMealType?: string,
  ): GeneratedRecipe {
    // Ensure required fields
    if (!recipe.title || !recipe.description || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Generated recipe is missing required fields');
    }

    // Validate title and description length
    if (recipe.title.trim().length < 3 || recipe.title.trim().length > 100) {
      throw new Error('Recipe title must be between 3 and 100 characters');
    }
    if (recipe.description.trim().length < 10 || recipe.description.trim().length > 500) {
      throw new Error('Recipe description must be between 10 and 500 characters');
    }

    // Ensure difficulty is valid
    if (!['easy', 'medium', 'hard'].includes(recipe.difficulty)) {
      recipe.difficulty = 'medium';
    }

    // Validate and normalize numeric fields
    recipe.cookTime = Math.max(5, Math.min(Number(recipe.cookTime) || 30, 480)); // 5 min to 8 hours
    recipe.servings = Math.max(1, Math.min(Math.round(Number(recipe.servings) || 1), 20)); // 1 to 20 servings
    recipe.calories = Math.max(0, Math.round(Number(recipe.calories) || 0));
    recipe.protein = Math.max(0, Math.round(Number(recipe.protein) || 0));
    recipe.carbs = Math.max(0, Math.round(Number(recipe.carbs) || 0));
    recipe.fat = Math.max(0, Math.round(Number(recipe.fat) || 0));
    recipe.fiber = recipe.fiber ? Math.max(0, Math.round(Number(recipe.fiber))) : undefined;

    // Validate macro accuracy: Calories should approximately match (protein*4 + carbs*4 + fat*9)
    const calculatedCalories = (recipe.protein * 4) + (recipe.carbs * 4) + (recipe.fat * 9);
    const calorieDifference = Math.abs(recipe.calories - calculatedCalories);
    const calorieTolerance = recipe.calories * 0.15; // 15% tolerance

    if (calorieDifference > calorieTolerance && recipe.calories > 50) {
      logger.warn(`⚠️  Macro mismatch: Reported ${recipe.calories} cal, calculated ${Math.round(calculatedCalories)} cal`);
      // Auto-correct calories if difference is significant
      if (calorieDifference > recipe.calories * 0.25) {
        recipe.calories = Math.round(calculatedCalories);
        logger.info(`✅ Auto-corrected calories to ${recipe.calories} based on macros`);
      }
    }

    // Validate ingredients (min 2, max 30)
    if (recipe.ingredients.length < 2) {
      throw new Error('Recipe must have at least 2 ingredients');
    }
    if (recipe.ingredients.length > 30) {
      throw new Error('Recipe cannot have more than 30 ingredients');
    }

    recipe.ingredients = recipe.ingredients.map((ing, index) => {
      const name = (ing.name || `Ingredient ${index + 1}`).trim();
      if (name.length === 0) {
        throw new Error(`Ingredient ${index + 1} has invalid name`);
      }
      return {
        name,
        amount: Math.max(0, Number(ing.amount) || 0),
        unit: (ing.unit || 'unit').trim(),
      };
    });

    // Validate instructions (min 2, max 20 steps)
    if (recipe.instructions.length < 2) {
      throw new Error('Recipe must have at least 2 instruction steps');
    }
    if (recipe.instructions.length > 20) {
      throw new Error('Recipe cannot have more than 20 instruction steps');
    }

    recipe.instructions = recipe.instructions.map((inst, index) => {
      const instruction = (inst.instruction || '').trim();
      if (instruction.length < 10) {
        throw new Error(`Instruction step ${index + 1} must be at least 10 characters`);
      }
      if (instruction.length > 1000) {
        throw new Error(`Instruction step ${index + 1} cannot exceed 1000 characters`);
      }
      return {
        step: index + 1,
        instruction,
      };
    });

    // Validate nutritional reasonableness. Up to 2500 cal/serving for larger
    // remaining meals; the lower bound is dropped for sauces (a tablespoon of
    // condiment is legitimately near-zero) — see assertCaloriesPerServing.
    const caloriesPerServing = recipe.calories / recipe.servings;
    assertCaloriesPerServing(caloriesPerServing, intendedMealType);

    // Validate macro ratios are reasonable (not all zero, not extreme)
    const totalMacros = recipe.protein + recipe.carbs + recipe.fat;
    if (totalMacros === 0 && recipe.calories > 0) {
      throw new Error('Recipe has calories but no macro nutrients - data invalid');
    }

    // Ensure arrays
    recipe.tips = recipe.tips || [];
    recipe.tags = recipe.tags || [];

    // Ensure mealType is set if not already provided
    if (!recipe.mealType) {
      recipe.mealType = 'lunch'; // Default meal type
    }

    return recipe;
  }

  /**
   * Perform safety checks on generated recipe
   */
  private performSafetyChecks(recipe: GeneratedRecipe, params: RecipeGenerationParams): void {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for banned ingredients
    if (params.userPreferences?.bannedIngredients && params.userPreferences.bannedIngredients.length > 0) {
      const ingredientNames = recipe.ingredients.map(ing => ing.name.toLowerCase());
      const bannedFound = params.userPreferences.bannedIngredients.filter(banned => {
        const bannedLower = banned.toLowerCase();
        return ingredientNames.some(ing => ing.includes(bannedLower) || bannedLower.includes(ing));
      });

      if (bannedFound.length > 0) {
        errors.push(`Recipe contains banned ingredients: ${bannedFound.join(', ')}`);
      }
    }

    // Check for dangerous ingredient combinations
    const dangerousCombinations = [
      { ingredients: ['raw fish', 'sushi', 'tartare'], warning: 'Contains raw fish - ensure freshness and quality' },
      { ingredients: ['raw egg', 'mayonnaise'], warning: 'Contains raw eggs - food safety concern' },
      { ingredients: ['raw meat', 'tartare', 'carpaccio'], warning: 'Contains raw meat - ensure proper handling' },
    ];

    const allIngredients = recipe.ingredients.map(ing => ing.name.toLowerCase()).join(' ');
    dangerousCombinations.forEach(combo => {
      if (combo.ingredients.some(ing => allIngredients.includes(ing))) {
        warnings.push(combo.warning);
      }
    });

    // Check cook time constraint for daily meal plan
    if (params.maxCookTimeForMeal && recipe.cookTime > params.maxCookTimeForMeal) {
      errors.push(`Recipe cook time (${recipe.cookTime} min) exceeds maximum allowed (${params.maxCookTimeForMeal} min) for this meal in the daily plan`);
    }
    
    // Check total prep time constraint
    if (params.maxTotalPrepTime && recipe.cookTime > params.maxTotalPrepTime) {
      errors.push(`Recipe cook time (${recipe.cookTime} min) exceeds remaining total prep time budget (${params.maxTotalPrepTime} min) for the day`);
    }
    
    // Note: Budget validation would require cost estimation from ingredients
    // Currently, budget constraint is enforced via AI prompt instructions
    // Future enhancement: Estimate recipe cost from ingredients and validate against remainingBudget
    
    // Check cook time reasonableness for meal type (only if no strict constraint is set)
    if (!params.maxCookTimeForMeal && params.mealType && params.mealType !== 'any') {
      const maxCookTimes: Record<string, number> = {
        breakfast: 45,
        lunch: 60,
        dinner: 90,
        snack: 15,
      };
      const maxTime = maxCookTimes[params.mealType];
      if (recipe.cookTime > maxTime) {
        warnings.push(`${params.mealType} typically takes less than ${maxTime} minutes`);
      }
    }

    // Check if recipe matches dietary restrictions
    if (params.userPreferences?.dietaryRestrictions && params.userPreferences.dietaryRestrictions.length > 0) {
      const restrictions = params.userPreferences.dietaryRestrictions.map(r => r.toLowerCase());

      // Check each ingredient individually so we can exclude plant-based alternatives.
      const ingredientNames = recipe.ingredients.map(ing => ing.name.toLowerCase());

      // Plant-based modifiers that should NOT count as dairy even when paired with
      // milk/butter/cream/cheese. Examples: "almond milk", "coconut cream",
      // "vegan butter", "non-dairy cheese", "oat milk".
      const PLANT_MODIFIERS = [
        'almond', 'coconut', 'oat', 'soy', 'rice', 'cashew', 'hemp',
        'pea', 'macadamia', 'hazelnut', 'walnut', 'flax', 'plant',
        'non-dairy', 'non dairy', 'dairy-free', 'dairy free', 'vegan',
        'nut', 'nutritional', // "nutritional yeast" is not dairy
      ];
      const isDairyIngredient = (name: string): boolean => {
        const lower = name.toLowerCase();
        const hasDairyKeyword = /\b(milk|cheese|butter|cream|yogurt|ghee|whey|casein)\b/.test(lower);
        if (!hasDairyKeyword) return false;
        // If a plant modifier appears anywhere in the name, treat as non-dairy.
        return !PLANT_MODIFIERS.some(mod => lower.includes(mod));
      };
      const isMeatIngredient = (name: string): boolean => {
        return /\b(chicken|beef|pork|lamb|turkey|bacon|ham|sausage|veal|duck)\b/.test(name);
      };
      const isEggIngredient = (name: string): boolean => {
        // Don't catch "eggplant".
        return /\begg(s|whites?|yolks?)?\b/.test(name) && !/eggplant/.test(name);
      };

      const hasMeat = ingredientNames.some(isMeatIngredient);
      const hasDairy = ingredientNames.some(isDairyIngredient);
      const hasEgg = ingredientNames.some(isEggIngredient);

      if (restrictions.includes('vegetarian') && hasMeat) {
        errors.push('Recipe contains meat but user requires vegetarian');
      }
      if (restrictions.includes('vegan') && (hasMeat || hasDairy || hasEgg)) {
        errors.push('Recipe contains animal products but user requires vegan');
      }
      if (restrictions.includes('dairy-free') && hasDairy) {
        const offending = ingredientNames.filter(isDairyIngredient).join(', ');
        errors.push(`Recipe contains dairy (${offending}) but user requires dairy-free`);
      }
    }

    // Check macro goal alignment (if provided)
    if (params.macroGoals) {
      const calorieDiff = Math.abs(recipe.calories - params.macroGoals.calories);
      const calorieTolerance = params.macroGoals.calories * 0.20; // 20% tolerance

      if (calorieDiff > calorieTolerance) {
        warnings.push(`Calories (${recipe.calories}) are ${Math.round(calorieDiff)} away from target (${params.macroGoals.calories})`);
      }

      const proteinDiff = Math.abs(recipe.protein - params.macroGoals.protein);
      const proteinTolerance = params.macroGoals.protein * 0.25; // 25% tolerance

      if (proteinDiff > proteinTolerance) {
        warnings.push(`Protein (${recipe.protein}g) is ${Math.round(proteinDiff)}g away from target (${params.macroGoals.protein}g)`);
      }
    }

    // Log warnings and throw on errors
    if (warnings.length > 0) {
      logger.warn({ data: warnings }, '⚠️  Recipe Safety Warnings:');
    }

    if (errors.length > 0) {
      logger.error({ data: errors }, '❌ Recipe Safety Errors:');
      throw new Error(`Recipe failed safety checks: ${errors.join('; ')}`);
    }

    // If we get here, recipe passed all safety checks
    if (warnings.length === 0) {
      logger.info('✅ Recipe passed all safety checks');
    }
  }

  /**
   * Save AI-generated recipe to database
   * OPTIMIZED: Fetch image in parallel with database operations
   */
  async saveGeneratedRecipe(recipe: GeneratedRecipe, userId: string | null) {
    try {
      logger.info('💾 Saving recipe...');
      
      // OPTIMIZATION: Fetch image in parallel with recipe creation (don't wait)
      logger.info('🖼️  Fetching recipe image (parallel)...');
      const imagePromise = imageService.searchFoodImage({
        recipeName: recipe.title,
        cuisine: recipe.cuisine,
        mainIngredient: recipe.ingredients[0]?.name,
      }).catch(err => {
        logger.warn({ data: err.message }, '⚠️  Image fetch failed, using fallback:');
        return null;
      });
      
      // OPTIMIZATION: Create recipe without image first (faster)
      const savedRecipe = await prisma.recipe.create({
        data: {
          userId,
          title: recipe.title,
          description: recipe.description,
          cuisine: recipe.cuisine,
          mealType: recipe.mealType,
          cookTime: recipe.cookTime,
          difficulty: recipe.difficulty,
          servings: recipe.servings,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          fiber: recipe.fiber,
          source: 'ai-generated',
          ingredients: {
            create: recipe.ingredients.map((ing, index) => ({
              text: `${ing.amount}${ing.unit} ${ing.name}`,
              order: index + 1,
            })),
          },
        },
        include: {
          ingredients: true,
        },
      });

      logger.info({ data: savedRecipe.id }, '✅ Recipe created:');

      // OPTIMIZATION: Add instructions in parallel with image fetch
      logger.info('📝 Adding instructions (parallel)...');
      const instructionsData = recipe.instructions.map((inst) => ({
        recipeId: savedRecipe.id,
        step: inst.step,
        text: inst.instruction,
      }));
      
      const [createdInstructions, photoData] = await Promise.all([
        Promise.all(
          instructionsData.map((instData) =>
            prisma.recipeInstruction.create({ data: instData })
          )
        ),
        imagePromise, // Wait for the image fetch we started earlier
      ]);

      logger.info({ data: createdInstructions.length }, '✅ Instructions added:');

      // OPTIMIZATION: Update recipe with image data (if available)
      if (photoData) {
        logger.info({ data: photoData.url }, '✅ Image URL obtained:');
        logger.info({ data: photoData.photographer.name }, '📸 Photographer:');
        
        await prisma.recipe.update({
          where: { id: savedRecipe.id },
          data: {
            imageUrl: photoData.url,
            unsplashPhotoId: photoData.id,
            unsplashDownloadLocation: photoData.downloadLocation,
            unsplashPhotographerName: photoData.photographer.name,
            unsplashPhotographerUsername: photoData.photographer.username,
            unsplashAttributionText: photoData.attributionText,
            unsplashUrl: photoData.unsplashUrl,
          },
        });
      } else {
        logger.info('⚠️  No image found, proceeding without image');
      }

      // Fetch the complete recipe with all relations
      const completeRecipe = await prisma.recipe.findUnique({
        where: { id: savedRecipe.id },
        include: {
          ingredients: true,
          instructions: true,
        },
      });

      logger.info({ data: completeRecipe?.id }, '💾 Saved AI recipe to database:');
      return completeRecipe!;
    } catch (error) {
      logger.error({ data: error }, '❌ Error saving AI recipe:');
      throw error;
    }
  }

  /**
   * Extract the main protein source from a recipe
   * Used for tracking variety in meal plans
   */
  private extractMainProtein(recipe: GeneratedRecipe): string | undefined {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return undefined;
    }

    // Common protein sources to look for
    const proteinKeywords = [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck',
      'salmon', 'tuna', 'cod', 'shrimp', 'fish', 'tilapia', 'halibut',
      'tofu', 'tempeh', 'seitan',
      'egg', 'eggs',
      'lentil', 'chickpea', 'bean', 'beans',
      'quinoa', // Track this since it's being overused
    ];

    // Check first 3 ingredients (usually the main protein is listed first)
    const topIngredients = recipe.ingredients.slice(0, 3);
    
    for (const ingredient of topIngredients) {
      // GeneratedRecipe uses 'name' property for ingredients
      const text = ingredient.name.toLowerCase();
      for (const keyword of proteinKeywords) {
        if (text.includes(keyword)) {
          return keyword;
        }
      }
    }

    return undefined;
  }
}

export const aiRecipeService = new AIRecipeService();

