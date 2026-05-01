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

const HAIKU_TASKS: AITaskType[] = [
  'safety_check',
  'craving_keyword_mapping',
  'ingredient_substitution',
  'nutrition_label_parse',
  'simple_chat',
];

// Note: healthify_craving is excluded from HAIKU_TASKS per spec — it routes to Sonnet
const SONNET_TASKS: AITaskType[] = [
  'recipe_generation',
  'photo_meal_recognition',
  'utterance_composition',
  'craving_natural_language',
  'healthify_craving',
];

const ALL_TASK_TYPES: AITaskType[] = [...HAIKU_TASKS, ...SONNET_TASKS];

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

  describe('Haiku tasks → claude-haiku-4-5-20251001', () => {
    it.each(HAIKU_TASKS)('routeToModel(%s) returns Haiku model', (taskType) => {
      const route = manager.routeToModel(taskType);
      expect(route.model).toBe(HAIKU_MODEL);
    });
  });

  describe('Sonnet tasks → claude-sonnet-4-6', () => {
    it.each(SONNET_TASKS)('routeToModel(%s) returns Sonnet model', (taskType) => {
      const route = manager.routeToModel(taskType);
      expect(route.model).toBe(SONNET_MODEL);
    });
  });

  describe('specific task routing spot-checks', () => {
    it('safety_check routes to Haiku', () => {
      const route = manager.routeToModel('safety_check');
      expect(route.model).toBe(HAIKU_MODEL);
      expect(route.provider).toBe('claude');
    });

    it('recipe_generation routes to Sonnet', () => {
      const route = manager.routeToModel('recipe_generation');
      expect(route.model).toBe(SONNET_MODEL);
      expect(route.provider).toBe('claude');
    });

    it('photo_meal_recognition routes to Sonnet', () => {
      const route = manager.routeToModel('photo_meal_recognition');
      expect(route.model).toBe(SONNET_MODEL);
    });

    it('craving_keyword_mapping routes to Haiku', () => {
      const route = manager.routeToModel('craving_keyword_mapping');
      expect(route.model).toBe(HAIKU_MODEL);
    });

    it('ingredient_substitution routes to Haiku', () => {
      const route = manager.routeToModel('ingredient_substitution');
      expect(route.model).toBe(HAIKU_MODEL);
    });

    it('nutrition_label_parse routes to Haiku', () => {
      const route = manager.routeToModel('nutrition_label_parse');
      expect(route.model).toBe(HAIKU_MODEL);
    });

    it('utterance_composition routes to Sonnet', () => {
      const route = manager.routeToModel('utterance_composition');
      expect(route.model).toBe(SONNET_MODEL);
    });

    it('craving_natural_language routes to Sonnet', () => {
      const route = manager.routeToModel('craving_natural_language');
      expect(route.model).toBe(SONNET_MODEL);
    });

    it('healthify_craving routes to Sonnet', () => {
      const route = manager.routeToModel('healthify_craving');
      expect(route.model).toBe(SONNET_MODEL);
    });

    it('simple_chat routes to Haiku', () => {
      const route = manager.routeToModel('simple_chat');
      expect(route.model).toBe(HAIKU_MODEL);
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
