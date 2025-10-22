// Test setup file
import { PrismaClient } from '@prisma/client';

// Mock Prisma for unit tests
jest.mock('../src/lib/prisma', () => ({
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
      delete: jest.fn()
    },
    recipeFeedback: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    bannedIngredient: {
      deleteMany: jest.fn()
    },
    likedCuisine: {
      deleteMany: jest.fn()
    },
    dietaryRestriction: {
      deleteMany: jest.fn()
    }
  }
}));

// Global test timeout
jest.setTimeout(10000);
