// backend/src/middleware/schemas.ts
// Zod schemas for key API routes. Import the schema + zodValidate middleware in any route file.
import { z } from 'zod';

// ─── Recipes ────────────────────────────────────────────────────────────────

export const createRecipeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  cookTime: z.number().int().min(1).max(1440),
  cuisine: z.string().min(1).max(100),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  servings: z.number().int().min(1).max(100).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  calories: z.number().int().min(0).max(10000),
  protein: z.number().int().min(0).max(1000),
  carbs: z.number().int().min(0).max(1000),
  fat: z.number().int().min(0).max(1000),
  fiber: z.number().int().min(0).max(500).optional(),
  sugar: z.number().int().min(0).max(500).optional(),
  ingredients: z.array(z.object({ text: z.string().min(1).max(500), order: z.number().int() })).min(1),
  instructions: z.array(z.object({ text: z.string().min(1).max(2000), step: z.number().int() })).min(1),
});

export const importRecipeUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

// ─── Shopping List ───────────────────────────────────────────────────────────

export const createShoppingListSchema = z.object({
  name: z.string().min(1).max(200),
});

export const addShoppingItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.string().max(100).optional(),
  unit: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  aisle: z.string().max(100).optional(),
  estimatedPrice: z.number().min(0).optional(),
  recipeId: z.string().optional(),
  note: z.string().max(500).optional(),
});

// ─── Meal Plan ───────────────────────────────────────────────────────────────

export const createMealPlanSchema = z.object({
  name: z.string().max(200).optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

// ─── User Profile ────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  profilePictureUrl: z.string().url().optional().or(z.literal('')),
});

// ─── Push Notifications ──────────────────────────────────────────────────────

export const registerTokenSchema = z.object({
  token: z.string().min(1, 'Push token is required'),
  platform: z.enum(['ios', 'android']),
});
