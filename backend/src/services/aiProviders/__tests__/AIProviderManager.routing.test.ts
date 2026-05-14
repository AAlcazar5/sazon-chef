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
//
// Note: `recipe_generation` is excluded here because Path B owns the
// free-tier route for that task (Gemini Flash-Lite + PII stripping).
// Premium / chef behavior for recipe_generation is asserted separately
// below alongside the Path B contract pins.
const CHEF_UPGRADE_TASKS: AITaskType[] = [
  'photo_meal_recognition',
  'utterance_composition',
  'craving_natural_language',
  'healthify_craving',
];

const ALL_TASK_TYPES: AITaskType[] = [...ALWAYS_HAIKU_TASKS, ...CHEF_UPGRADE_TASKS, 'recipe_generation'];

describe('AIProviderManager.routeToModel', () => {
  let manager: AIProviderManager;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    manager = new AIProviderManager();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('PII guard — provider is claude for every task except Path B free recipe_generation', () => {
    // Path B intentionally relaxes the PII guard for one specific route
    // (recipe_generation × free tier) by routing to Gemini Flash-Lite, but
    // ONLY after the prompt is stripped of PII via buildSanitizedRecipePrompt.
    // Every other (task × tier) cell must still land on claude.
    it.each(ALL_TASK_TYPES)('routeToModel(%s, premium) returns provider "claude"', (taskType) => {
      expect(manager.routeToModel(taskType, 'premium').provider).toBe('claude');
    });
    it.each(ALL_TASK_TYPES)('routeToModel(%s, chef) returns provider "claude"', (taskType) => {
      expect(manager.routeToModel(taskType, 'chef').provider).toBe('claude');
    });
    it.each(ALL_TASK_TYPES.filter((t) => t !== 'recipe_generation'))(
      'routeToModel(%s, free) returns provider "claude"',
      (taskType) => {
        expect(manager.routeToModel(taskType, 'free').provider).toBe('claude');
      },
    );
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

  describe('Path B — recipe_generation free tier routes through DeepSeek + PII strip', () => {
    it('free tier model is deepseek-chat (DeepSeek-V3)', () => {
      const route = manager.routeToModel('recipe_generation', 'free');
      expect(route.model).toBe('deepseek-chat');
      expect(route.provider).toBe('deepseek');
    });
    it('free tier carries providerOrder = [deepseek, claude] for fallback', () => {
      const route = manager.routeToModel('recipe_generation', 'free');
      expect(route.providerOrder).toEqual(['deepseek', 'claude']);
    });
    it('free tier flags requiresPiiStripping = true so callers must sanitize', () => {
      const route = manager.routeToModel('recipe_generation', 'free');
      expect(route.requiresPiiStripping).toBe(true);
    });
    it('premium tier stays on claude Haiku (no Path B leakage)', () => {
      const route = manager.routeToModel('recipe_generation', 'premium');
      expect(route.provider).toBe('claude');
      expect(route.model).toBe(HAIKU_MODEL);
      expect(route.requiresPiiStripping).toBeFalsy();
    });
    it('chef tier upgrades to claude Sonnet', () => {
      const route = manager.routeToModel('recipe_generation', 'chef');
      expect(route.provider).toBe('claude');
      expect(route.model).toBe(SONNET_MODEL);
      expect(route.requiresPiiStripping).toBeFalsy();
    });
  });

  describe('default tier behavior', () => {
    it('routeToModel without an explicit tier defaults to free', () => {
      // Backwards compat: old callers that just pass taskType get the
      // free route. For recipe_generation that's the Path B Gemini lane.
      expect(manager.routeToModel('recipe_generation').provider).toBe('deepseek');
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
