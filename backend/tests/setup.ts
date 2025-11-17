// Test setup file
import { PrismaClient } from '@prisma/client';

// Shared Prisma mock object
const createPrismaMock = () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn()
    },
    recipe: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    macroGoals: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    userPhysicalProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    savedRecipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn()
    },
    recipeFeedback: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    bannedIngredient: {
      deleteMany: jest.fn()
    },
    likedCuisine: {
      deleteMany: jest.fn()
    },
    dietaryRestriction: {
      deleteMany: jest.fn()
    },
    collection: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    recipeCollection: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn()
    },
    recipeIngredient: {
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    recipeInstruction: {
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    mealPrepPortion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mealPrepConsumption: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    mealPrepSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mealPrepTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
  }
});

// Mock Prisma for all path alias variations
jest.mock('../src/lib/prisma', () => createPrismaMock());
jest.mock('@lib/prisma', () => createPrismaMock());
jest.mock('@/lib/prisma', () => createPrismaMock());

// Don't mock utils - tests need the real implementations

// Mock modules - return Express Router instances
// Use actual Express Router for mocks
const express = require('express');
const mockRouter = express.Router();

jest.mock('@modules/recipe/recipeRoutes', () => ({
  recipeRoutes: mockRouter
}));
jest.mock('@modules/user/userRoutes', () => ({
  userRoutes: mockRouter
}));
jest.mock('@modules/mealPlan/mealPlanRoutes', () => ({
  default: mockRouter
}));
jest.mock('@modules/dailySuggestions/dailySuggestionsRoutes', () => ({
  dailySuggestionsRoutes: mockRouter
}));
jest.mock('@modules/mealHistory/mealHistoryRoutes', () => ({
  mealHistoryRoutes: mockRouter
}));
jest.mock('@modules/aiRecipe/aiRecipeRoutes', () => ({
  default: mockRouter
}));

// Global test timeout
jest.setTimeout(10000);
