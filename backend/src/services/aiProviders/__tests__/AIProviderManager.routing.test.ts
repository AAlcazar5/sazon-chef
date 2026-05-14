import { AIProviderManager } from '../AIProviderManager';
import type { AITaskType } from '../AIProvider';

// Mock providers so constructor doesn't require real API keys
jest.mock('../ClaudeProvider', () => ({
  ClaudeProvider: jest.fn().mockImplementation(() => ({
    getName: () => 'Claude (Anthropic)',
    isAvailable: () => true,
    isConfigured: true,
    normalizeError: jest.fn(),
    generateRecipe: jest.fn(),
  })),
}));

jest.mock('../GeminiProvider', () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    getName: () => 'Gemini (Google)',
    isAvailable: () => false,
    isConfigured: false,
    normalizeError: jest.fn(),
    generateRecipe: jest.fn(),
  })),
}));

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';

// Path A — tier-aware routing.
// Free + Premium share Haiku as the baseline; Chef gets Sonnet on
// recipe-quality-sensitive tasks. The 5 tasks below are Haiku for all
// three tiers (binary classification / lookup / extraction style).
const ALWAYS_HAIKU_TASKS: AITaskType[] = [
  'safety_check',
  'craving_keyword_mapping',
  'ingredient_substitution',
  'nutrition_label_parse',
  'simple_chat',
];

// These tasks were Sonnet for everyone pre-Path-A. Now they're Haiku on
// free + premium (the "cost relief" half of Path A), Sonnet on chef.
const CHEF_UPGRADE_TASKS: AITaskType[] = [
  'recipe_generation',
  'photo_meal_recognition',
  'utterance_composition',
  'craving_natural_language',
  'healthify_craving',
];

const ALL_TASK_TYPES: AITaskType[] = [...ALWAYS_HAIKU_TASKS, ...CHEF_UPGRADE_TASKS];

describe('AIProviderManager.routeToModel', () => {
  let manager: AIProviderManager;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    manager = new AIProviderManager();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('provider is always claude (PII guard)', () => {
    it.each(ALL_TASK_TYPES)('routeToModel(%s) returns provider "claude"', (taskType) => {
      const route = manager.routeToModel(taskType);
      expect(route.provider).toBe('claude');
    });
  });

  describe('reasoning is always non-empty', () => {
    it.each(ALL_TASK_TYPES)('routeToModel(%s) returns non-empty reasoning', (taskType) => {
      const route = manager.routeToModel(taskType);
      expect(typeof route.reasoning).toBe('string');
      expect(route.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('always-Haiku tasks (binary / lookup / extraction)', () => {
    it.each(ALWAYS_HAIKU_TASKS)('routeToModel(%s) returns Haiku for free tier', (taskType) => {
      expect(manager.routeToModel(taskType, 'free').model).toBe(HAIKU_MODEL);
    });
    it.each(ALWAYS_HAIKU_TASKS)('routeToModel(%s) returns Haiku for premium tier', (taskType) => {
      expect(manager.routeToModel(taskType, 'premium').model).toBe(HAIKU_MODEL);
    });
    it.each(ALWAYS_HAIKU_TASKS)('routeToModel(%s) returns Haiku for chef tier', (taskType) => {
      expect(manager.routeToModel(taskType, 'chef').model).toBe(HAIKU_MODEL);
    });
  });

  describe('chef-upgrade tasks — Haiku for free + premium, Sonnet for chef', () => {
    it.each(CHEF_UPGRADE_TASKS)('routeToModel(%s, free) returns Haiku', (taskType) => {
      expect(manager.routeToModel(taskType, 'free').model).toBe(HAIKU_MODEL);
    });
    it.each(CHEF_UPGRADE_TASKS)('routeToModel(%s, premium) returns Haiku', (taskType) => {
      expect(manager.routeToModel(taskType, 'premium').model).toBe(HAIKU_MODEL);
    });
    it.each(CHEF_UPGRADE_TASKS)('routeToModel(%s, chef) returns Sonnet', (taskType) => {
      expect(manager.routeToModel(taskType, 'chef').model).toBe(SONNET_MODEL);
    });
  });

  describe('default tier behavior', () => {
    it('routeToModel without an explicit tier defaults to free (Haiku)', () => {
      // Backwards compat: old callers that just pass taskType get the
      // cheapest route — which is also the safest fall-back.
      expect(manager.routeToModel('recipe_generation').model).toBe(HAIKU_MODEL);
      expect(manager.routeToModel('healthify_craving').model).toBe(HAIKU_MODEL);
    });
  });

  describe('all 10 task types have a defined route', () => {
    it('covers all 10 task types without throwing', () => {
      expect(ALL_TASK_TYPES).toHaveLength(10);
      for (const taskType of ALL_TASK_TYPES) {
        expect(() => manager.routeToModel(taskType)).not.toThrow();
      }
    });
  });
});
