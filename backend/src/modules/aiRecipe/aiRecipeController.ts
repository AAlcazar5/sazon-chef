// backend/src/modules/aiRecipe/aiRecipeController.ts
import { Request, Response } from 'express';
import { aiRecipeService } from '../../services/aiRecipeService';
import { prisma } from '../../lib/prisma';

export class AIRecipeController {
  /**
   * Generate a random AI recipe based on user preferences
   * GET /api/ai-recipes/generate
   * 
   * Query params:
   * - cuisine: (optional) Specific cuisine to generate (overrides random selection)
   * - mealType: (optional) breakfast/lunch/dinner/snack (overrides random selection)
   * - maxCookTime: (optional) Maximum cook time in minutes (respects user filters)
   */
  async generateRecipe(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const userId = 'temp-user-id'; // TODO: Replace with actual auth
      const { cuisine, mealType, maxCookTime } = req.query;

      console.log('⏱️  AI Recipe Generation: Request started at', new Date().toISOString());
      console.log('🎯 Generate AI Recipe Request:', { userId, cuisine, mealType, maxCookTime });

      // Fetch user data including feedback for AI learning
      const [preferences, macroGoals, physicalProfile, feedbackData] = await Promise.all([
        prisma.userPreferences.findUnique({
          where: { userId },
          include: {
            likedCuisines: true,
            dietaryRestrictions: true,
            bannedIngredients: true,
          },
        }),
        prisma.macroGoals.findUnique({
          where: { userId },
        }),
        prisma.userPhysicalProfile.findUnique({
          where: { userId },
        }),
        // Get user feedback (liked/disliked recipes) for AI learning
        prisma.recipeFeedback.findMany({
          where: { userId },
          include: {
            recipe: {
              include: {
                ingredients: true,
              },
            },
          },
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Process feedback into liked/disliked recipe patterns
      const likedRecipes = feedbackData
        .filter(f => f.liked)
        .slice(0, 10)
        .map(f => ({
          title: f.recipe.title,
          cuisine: f.recipe.cuisine,
          ingredients: f.recipe.ingredients.map(i => i.text.toLowerCase()),
          cookTime: f.recipe.cookTime,
        }));

      const dislikedRecipes = feedbackData
        .filter(f => f.disliked)
        .slice(0, 10)
        .map(f => ({
          title: f.recipe.title,
          cuisine: f.recipe.cuisine,
          ingredients: f.recipe.ingredients.map(i => i.text.toLowerCase()),
          cookTime: f.recipe.cookTime,
        }));

      // Check if recipe title is provided (for recipe form generation)
      const recipeTitle = req.query.recipeTitle as string | undefined;

      // RANDOMIZATION: Pick a random meal type if not specified (unless recipe title is provided)
      const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];
      let randomMealType = mealType || mealTypes[Math.floor(Math.random() * mealTypes.length)];
      
      // If recipe title is provided, try to infer meal type from title
      if (recipeTitle && !mealType) {
        const titleLower = recipeTitle.toLowerCase();
        if (titleLower.includes('breakfast') || titleLower.includes('pancake') || titleLower.includes('waffle') || titleLower.includes('omelet')) {
          randomMealType = 'breakfast';
        } else if (titleLower.includes('snack') || titleLower.includes('appetizer')) {
          randomMealType = 'snack';
        } else {
          randomMealType = 'dinner'; // Default to dinner for most recipes
        }
      }

      // RANDOMIZATION: Pick a random cuisine from user preferences (or all cuisines)
      // If recipe title is provided, try to infer cuisine from title
      let randomCuisine = cuisine as string;
      if (recipeTitle && !randomCuisine) {
        const titleLower = recipeTitle.toLowerCase();
        const cuisineKeywords: Record<string, string> = {
          'italian': 'Italian',
          'fettuccini': 'Italian',
          'alfredo': 'Italian',
          'pasta': 'Italian',
          'pizza': 'Italian',
          'chinese': 'Chinese',
          'japanese': 'Japanese',
          'sushi': 'Japanese',
          'mexican': 'Mexican',
          'taco': 'Mexican',
          'indian': 'Indian',
          'curry': 'Indian',
          'thai': 'Thai',
          'french': 'French',
          'mediterranean': 'Mediterranean',
          'greek': 'Mediterranean',
        };
        
        for (const [keyword, cuisineType] of Object.entries(cuisineKeywords)) {
          if (titleLower.includes(keyword)) {
            randomCuisine = cuisineType;
            break;
          }
        }
      }
      
      if (!randomCuisine && preferences?.likedCuisines && preferences.likedCuisines.length > 0) {
        const likedCuisines = preferences.likedCuisines.map((c) => c.name);
        randomCuisine = likedCuisines[Math.floor(Math.random() * likedCuisines.length)];
      }

      // MACRO DISTRIBUTION: Divide daily macros into a single meal (based on meal type)
      const mealMacroDistribution: Record<string, number> = {
        breakfast: 0.25, // 25% of daily
        lunch: 0.30,     // 30% of daily
        dinner: 0.35,    // 35% of daily
        snack: 0.10,     // 10% of daily
      };
      const mealPortion = mealMacroDistribution[randomMealType as string] || 0.30;

      console.log('🎲 Randomization:', {
        mealType: randomMealType,
        cuisine: randomCuisine,
        mealPortion: `${Math.round(mealPortion * 100)}%`,
        targetCalories: macroGoals ? Math.round(macroGoals.calories * mealPortion) : 'N/A',
      });

      // Generate recipe with AI
      const recipe = await aiRecipeService.generateRecipe({
        userId,
        recipeTitle: recipeTitle, // Pass recipe title if provided
        userPreferences: preferences
          ? {
              likedCuisines: preferences.likedCuisines.map((c) => c.name),
              dietaryRestrictions: preferences.dietaryRestrictions.map((d) => d.name),
              bannedIngredients: preferences.bannedIngredients.map((b) => b.name),
              spiceLevel: preferences.spiceLevel || 'medium',
              // Use filtered max cook time if provided, otherwise use user preference
              cookTimePreference: maxCookTime ? parseInt(maxCookTime as string) : (preferences.cookTimePreference || 30),
            }
          : undefined,
        macroGoals: macroGoals
          ? {
              // Divide daily macros by meal portion
              calories: Math.round(macroGoals.calories * mealPortion),
              protein: Math.round(macroGoals.protein * mealPortion),
              carbs: Math.round(macroGoals.carbs * mealPortion),
              fat: Math.round(macroGoals.fat * mealPortion),
            }
          : undefined,
        physicalProfile: physicalProfile
          ? {
              gender: physicalProfile.gender,
              age: physicalProfile.age,
              activityLevel: physicalProfile.activityLevel,
              fitnessGoal: physicalProfile.fitnessGoal,
            }
          : undefined,
        mealType: randomMealType as any,
        cuisineOverride: randomCuisine,
        userFeedback: (likedRecipes.length > 0 || dislikedRecipes.length > 0)
          ? {
              likedRecipes,
              dislikedRecipes,
            }
          : undefined,
      });

      // Save to database
      const savedRecipe = await aiRecipeService.saveGeneratedRecipe(recipe, userId);

      const totalTime = Date.now() - startTime;
      console.log(`⏱️  AI Recipe Generation: Completed in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);

      res.json({
        success: true,
        recipe: {
          id: savedRecipe.id,
          title: savedRecipe.title,
          description: savedRecipe.description,
          cuisine: savedRecipe.cuisine,
          cookTime: savedRecipe.cookTime,
          difficulty: savedRecipe.difficulty,
          servings: savedRecipe.servings,
          calories: savedRecipe.calories,
          protein: savedRecipe.protein,
          carbs: savedRecipe.carbs,
          fat: savedRecipe.fat,
          fiber: savedRecipe.fiber,
          imageUrl: savedRecipe.imageUrl,
          source: 'ai-generated',
          ingredients: savedRecipe.ingredients,
          instructions: savedRecipe.instructions.map((inst: any) => ({
            step: inst.step,
            instruction: inst.text,
          })),
        },
      });
    } catch (error: any) {
      console.error('❌ Generate AI Recipe Error:', error);
      
      // Check if it's a quota/billing error from OpenAI
      const isQuotaError = error.code === 'insufficient_quota' || 
                          error.status === 429 ||
                          error.message?.includes('quota') ||
                          error.message?.includes('billing');
      
      const statusCode = isQuotaError ? 429 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: isQuotaError ? 'Quota exceeded' : 'Failed to generate recipe',
        message: error.message,
        code: error.code || (isQuotaError ? 'insufficient_quota' : 'GENERATION_ERROR'),
      });
    }
  }

  /**
   * Generate daily meal plan with AI
   * GET /api/ai-recipes/daily-plan
   * 
   * Query params:
   * - meals: (optional) Comma-separated list of meals to generate: breakfast,lunch,dinner,snack
   * - mealCount: (optional) Custom number of meals to split remaining macros into
   * - cuisine: (optional) Specific cuisine to use for all meals
   * - useRemainingMacros: (optional) Boolean, if true, calculates remaining macros from existing meals
   */
  async generateDailyPlan(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id'; // TODO: Replace with actual auth
      const { meals, mealCount, cuisine, useRemainingMacros, remainingCalories, remainingProtein, remainingCarbs, remainingFat } = req.query;

      console.log('🍽️ Generate AI Daily Plan Request:', { userId, meals, mealCount, cuisine, useRemainingMacros, remainingCalories, remainingProtein, remainingCarbs, remainingFat });

      // Fetch user data including feedback for AI learning
      const [preferences, macroGoals, physicalProfile, feedbackData] = await Promise.all([
        prisma.userPreferences.findUnique({
          where: { userId },
          include: {
            likedCuisines: true,
            dietaryRestrictions: true,
            bannedIngredients: true,
          },
        }),
        prisma.macroGoals.findUnique({
          where: { userId },
        }),
        prisma.userPhysicalProfile.findUnique({
          where: { userId },
        }),
        // Get user feedback (liked/disliked recipes) for AI learning
        prisma.recipeFeedback.findMany({
          where: { userId },
          include: {
            recipe: {
              include: {
                ingredients: true,
              },
            },
          },
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Process feedback into liked/disliked recipe patterns
      const likedRecipes = feedbackData
        .filter(f => f.liked)
        .slice(0, 10)
        .map(f => ({
          title: f.recipe.title,
          cuisine: f.recipe.cuisine,
          ingredients: f.recipe.ingredients.map(i => i.text.toLowerCase()),
          cookTime: f.recipe.cookTime,
        }));

      const dislikedRecipes = feedbackData
        .filter(f => f.disliked)
        .slice(0, 10)
        .map(f => ({
          title: f.recipe.title,
          cuisine: f.recipe.cuisine,
          ingredients: f.recipe.ingredients.map(i => i.text.toLowerCase()),
          cookTime: f.recipe.cookTime,
        }));

      // Determine which meals to generate
      let mealsToGenerate: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> | undefined;
      if (meals) {
        const mealList = (meals as string).split(',').map(m => m.trim().toLowerCase());
        mealsToGenerate = mealList.filter(m => 
          ['breakfast', 'lunch', 'dinner', 'snack'].includes(m)
        ) as Array<'breakfast' | 'lunch' | 'dinner' | 'snack'>;
      }

      // Calculate remaining macros if requested
      let remainingMacros = undefined;
      const shouldUseRemainingMacros = useRemainingMacros === 'true' || useRemainingMacros === '1';
      if (shouldUseRemainingMacros && remainingCalories && remainingProtein && remainingCarbs && remainingFat) {
        // Use the remaining macros passed from frontend
        remainingMacros = {
          calories: parseInt(remainingCalories as string),
          protein: parseInt(remainingProtein as string),
          carbs: parseInt(remainingCarbs as string),
          fat: parseInt(remainingFat as string),
        };
        console.log('📊 Using remaining macros from request:', remainingMacros);
      }

      // Build generation options
      const generationOptions: any = {};
      if (mealsToGenerate) {
        generationOptions.mealsToGenerate = mealsToGenerate;
      }
      if (mealCount) {
        generationOptions.customMealCount = parseInt(mealCount as string);
      }
      if (remainingMacros) {
        generationOptions.remainingMacros = remainingMacros;
      }

      // Build user preferences with optional cuisine override
      const userPrefs = preferences
        ? {
            likedCuisines: cuisine
              ? [cuisine as string] // Override with specified cuisine
              : preferences.likedCuisines.map((c) => c.name),
            dietaryRestrictions: preferences.dietaryRestrictions.map((d) => d.name),
            bannedIngredients: preferences.bannedIngredients.map((b) => b.name),
            spiceLevel: preferences.spiceLevel || 'medium',
            cookTimePreference: preferences.cookTimePreference || 30,
          }
        : undefined;

      // Generate daily meal plan
      const mealPlan = await aiRecipeService.generateDailyMealPlan(
        {
          userId,
          userPreferences: userPrefs,
          macroGoals: macroGoals
            ? {
                calories: macroGoals.calories,
                protein: macroGoals.protein,
                carbs: macroGoals.carbs,
                fat: macroGoals.fat,
              }
            : undefined,
          physicalProfile: physicalProfile
            ? {
                gender: physicalProfile.gender,
                age: physicalProfile.age,
                activityLevel: physicalProfile.activityLevel,
                fitnessGoal: physicalProfile.fitnessGoal,
              }
            : undefined,
          cuisineOverride: cuisine as string | undefined,
          userFeedback: (likedRecipes.length > 0 || dislikedRecipes.length > 0)
            ? {
                likedRecipes,
                dislikedRecipes,
              }
            : undefined,
        },
        generationOptions
      );

      // Save all generated recipes to database
      const savedRecipes: any = {};
      const savePromises: Promise<any>[] = [];

      if (mealPlan.breakfast) {
        savePromises.push(
          aiRecipeService.saveGeneratedRecipe(mealPlan.breakfast, userId).then(saved => {
            savedRecipes.breakfast = { id: saved.id, ...mealPlan.breakfast };
          })
        );
      }
      if (mealPlan.lunch) {
        savePromises.push(
          aiRecipeService.saveGeneratedRecipe(mealPlan.lunch, userId).then(saved => {
            savedRecipes.lunch = { id: saved.id, ...mealPlan.lunch };
          })
        );
      }
      if (mealPlan.dinner) {
        savePromises.push(
          aiRecipeService.saveGeneratedRecipe(mealPlan.dinner, userId).then(saved => {
            savedRecipes.dinner = { id: saved.id, ...mealPlan.dinner };
          })
        );
      }
      if (mealPlan.snack) {
        savePromises.push(
          aiRecipeService.saveGeneratedRecipe(mealPlan.snack, userId).then(saved => {
            savedRecipes.snack = { id: saved.id, ...mealPlan.snack };
          })
        );
      }

      await Promise.all(savePromises);

      // Calculate total nutrition
      let totalNutrition = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

      Object.values(savedRecipes).forEach((recipe: any) => {
        totalNutrition.calories += recipe.calories || 0;
        totalNutrition.protein += recipe.protein || 0;
        totalNutrition.carbs += recipe.carbs || 0;
        totalNutrition.fat += recipe.fat || 0;
      });

      res.json({
        success: true,
        mealPlan: savedRecipes,
        totalNutrition,
      });
    } catch (error: any) {
      console.error('❌ Generate AI Daily Plan Error:', error);
      
      // Check if it's a quota/billing error from OpenAI
      const isQuotaError = error.code === 'insufficient_quota' || 
                          error.status === 429 ||
                          error.message?.includes('quota') ||
                          error.message?.includes('billing');
      
      const statusCode = isQuotaError ? 429 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: isQuotaError ? 'Quota exceeded' : 'Failed to generate daily meal plan',
        message: error.message,
        code: error.code || (isQuotaError ? 'insufficient_quota' : 'GENERATION_ERROR'),
      });
    }
  }

  /**
   * Calculate remaining macros from existing meals
   * POST /api/ai-recipes/remaining-macros
   * Body: { existingMeals: Array<{ calories: number, protein: number, carbs: number, fat: number }> }
   */
  async calculateRemainingMacros(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id'; // TODO: Replace with actual auth
      const { existingMeals } = req.body;

      console.log('📊 Calculate Remaining Macros Request:', { userId, mealCount: existingMeals?.length });

      // Get user's macro goals
      const macroGoals = await prisma.macroGoals.findUnique({
        where: { userId },
      });

      if (!macroGoals) {
        return res.status(404).json({
          success: false,
          error: 'Macro goals not found',
        });
      }

      // Calculate consumed macros
      const consumed = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

      if (existingMeals && Array.isArray(existingMeals)) {
        existingMeals.forEach((meal: any) => {
          consumed.calories += meal.calories || 0;
          consumed.protein += meal.protein || 0;
          consumed.carbs += meal.carbs || 0;
          consumed.fat += meal.fat || 0;
        });
      }

      // Calculate remaining macros
      const remaining = {
        calories: Math.max(0, macroGoals.calories - consumed.calories),
        protein: Math.max(0, macroGoals.protein - consumed.protein),
        carbs: Math.max(0, macroGoals.carbs - consumed.carbs),
        fat: Math.max(0, macroGoals.fat - consumed.fat),
      };

      res.json({
        success: true,
        target: {
          calories: macroGoals.calories,
          protein: macroGoals.protein,
          carbs: macroGoals.carbs,
          fat: macroGoals.fat,
        },
        consumed,
        remaining,
      });
    } catch (error: any) {
      console.error('❌ Calculate Remaining Macros Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate remaining macros',
        message: error.message,
      });
    }
  }

  /**
   * Get AI-generated recipes from database
   * GET /api/ai-recipes
   */
  async getAIRecipes(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id'; // TODO: Replace with actual auth
      const limit = parseInt(req.query.limit as string) || 20;

      const recipes = await prisma.recipe.findMany({
        where: {
          userId,
          source: 'ai-generated',
        },
        include: {
          ingredients: true,
          instructions: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      res.json({
        success: true,
        recipes: recipes.map((recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          cuisine: recipe.cuisine,
          cookTime: recipe.cookTime,
          difficulty: recipe.difficulty,
          servings: recipe.servings,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          fiber: recipe.fiber,
          imageUrl: recipe.imageUrl,
          source: recipe.source,
          ingredients: recipe.ingredients || [],
          instructions: (recipe.instructions || []).map((inst: any) => ({
            step: inst.step,
            instruction: inst.text,
          })),
          createdAt: recipe.createdAt,
        })),
      });
    } catch (error: any) {
      console.error('❌ Get AI Recipes Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI recipes',
        message: error.message,
      });
    }
  }
}

export const aiRecipeController = new AIRecipeController();

