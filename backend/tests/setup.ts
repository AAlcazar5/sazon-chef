// Test setup file
import { PrismaClient } from '@prisma/client';

// Shared Prisma mock object
const createPrismaMock = () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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
      findFirst: jest.fn(),
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
    },
    pushToken: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    notificationSettings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    mealPlan: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cookingLog: {
      count: jest.fn(),
    },
    stripeWebhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    cancellationSurvey: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    cravingSearchEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
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
  __esModule: true, default: mockRouter
}));
jest.mock('@modules/dailySuggestions/dailySuggestionsRoutes', () => ({
  dailySuggestionsRoutes: mockRouter
}));
jest.mock('@modules/mealHistory/mealHistoryRoutes', () => ({
  mealHistoryRoutes: mockRouter
}));
jest.mock('@modules/aiRecipe/aiRecipeRoutes', () => ({
  __esModule: true, default: mockRouter
}));
jest.mock('@modules/notifications/notificationsRoutes', () => ({
  notificationsRoutes: mockRouter
}));
jest.mock('@modules/stripe/stripeRoutes', () => ({
  stripeRoutes: mockRouter
}));
jest.mock('@modules/auth/authRoutes', () => ({
  authRoutes: mockRouter
}));
jest.mock('@modules/healthMetrics/healthMetricsRoutes', () => ({
  healthMetricsRoutes: mockRouter
}));
jest.mock('@modules/weightGoal/weightGoalRoutes', () => ({
  weightGoalRoutes: mockRouter
}));
jest.mock('@modules/mealPrep/mealPrepRoutes', () => ({
  mealPrepRoutes: mockRouter
}));
jest.mock('@modules/scanner/scannerRoutes', () => ({
  scannerRoutes: mockRouter
}));
jest.mock('@modules/search/searchRoutes', () => ({
  searchRoutes: mockRouter
}));
jest.mock('@modules/shoppingList/shoppingListRoutes', () => ({
  __esModule: true, default: mockRouter
}));
jest.mock('@modules/shoppingList/shoppingAppRoutes', () => ({
  __esModule: true, default: mockRouter
}));
jest.mock('@modules/costTracking/costTrackingRoutes', () => ({
  __esModule: true, default: mockRouter
}));
jest.mock('@modules/ingredientAvailability/ingredientAvailabilityRoutes', () => ({
  __esModule: true, default: mockRouter
}));
jest.mock('@modules/pantry/pantryRoutes', () => ({
  __esModule: true, default: mockRouter
}));
jest.mock('@modules/upload/uploadRoute', () => ({
  __esModule: true, default: mockRouter
}));

// Mock expo-server-sdk (ESM module that Jest can't transform)
jest.mock('expo-server-sdk', () => {
  const mockExpo = {
    chunkPushNotifications: jest.fn((messages: any[]) => [messages]),
    sendPushNotificationsAsync: jest.fn().mockResolvedValue([{ status: 'ok' }]),
  };
  const ExpoClass = jest.fn(() => mockExpo);
  (ExpoClass as any).isExpoPushToken = jest.fn(() => true);
  return { __esModule: true, default: ExpoClass };
});

// Mock stripe SDK
jest.mock('stripe', () => {
  const mockStripeInstance = {
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/test' }),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }),
      },
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        trial_end: null,
      }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
  const StripeMock = jest.fn(() => mockStripeInstance);
  return { __esModule: true, default: StripeMock };
});

// Mock resend (email service — not configured in test env)
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}));

// Global test timeout
jest.setTimeout(10000);
