// ROADMAP 4.0 Tier U / M5 — typed JSON-column accessor tests.

import {
  parseJsonColumn,
  parseJsonColumnNullable,
  serializeJsonColumn,
  JSON_COLUMN_SCHEMAS,
} from '../../src/utils/jsonColumns';

describe('M5 — jsonColumns helper', () => {
  describe('parseJsonColumn', () => {
    it('returns the typed value for a well-formed stringified payload', () => {
      const result = parseJsonColumn('appliances', '["ninja_creami","air_fryer"]');
      expect(result).toEqual(['ninja_creami', 'air_fryer']);
    });

    it('returns the default on null / undefined / empty string (no throw)', () => {
      expect(parseJsonColumn('appliances', null)).toEqual([]);
      expect(parseJsonColumn('appliances', undefined)).toEqual([]);
      expect(parseJsonColumn('appliances', '')).toEqual([]);
    });

    it('returns the default on malformed JSON (no throw)', () => {
      expect(parseJsonColumn('appliances', '{not json')).toEqual([]);
      expect(parseJsonColumn('appliances', 'undefined')).toEqual([]);
    });

    it('returns the default on shape mismatch (zod rejects, no throw)', () => {
      // a string array column receiving a number array
      expect(parseJsonColumn('appliances', '[1,2,3]')).toEqual([]);
    });

    it('accepts a caller-supplied fallback', () => {
      expect(parseJsonColumn('appliances', null, ['default_oven'])).toEqual(['default_oven']);
    });

    it('parses the complex componentIds shape', () => {
      const raw = JSON.stringify([
        { slot: 'protein', componentId: 'abc', portionMultiplier: 1.5 },
        { slot: 'base', componentId: 'xyz', portionMultiplier: 1 },
      ]);
      const result = parseJsonColumn('componentIds', raw);
      expect(result).toEqual([
        { slot: 'protein', componentId: 'abc', portionMultiplier: 1.5 },
        { slot: 'base', componentId: 'xyz', portionMultiplier: 1 },
      ]);
    });

    it('drops malformed componentIds entries via the schema fallback', () => {
      const raw = JSON.stringify([
        { slot: 'protein', componentId: 'abc', portionMultiplier: 1.5 },
        { componentId: 'xyz' }, // missing slot + portionMultiplier — schema rejects
      ]);
      const result = parseJsonColumn('componentIds', raw);
      // safeParse returns [] when ANY element fails — the whole array is rejected
      expect(result).toEqual([]);
    });

    it('parses freeform-json columns (contextSnapshot, signalsUsed, data)', () => {
      const raw = JSON.stringify({ user: 'abc', candidates: 5, nested: { ok: true } });
      const result = parseJsonColumn('contextSnapshot', raw);
      expect(result).toEqual({ user: 'abc', candidates: 5, nested: { ok: true } });
    });
  });

  describe('parseJsonColumnNullable', () => {
    it('returns null on null/undefined/empty (does not coerce to default)', () => {
      expect(parseJsonColumnNullable('summaryStats', null)).toBeNull();
      expect(parseJsonColumnNullable('summaryStats', undefined)).toBeNull();
      expect(parseJsonColumnNullable('summaryStats', '')).toBeNull();
    });

    it('returns the parsed payload when input is present + well-formed', () => {
      expect(parseJsonColumnNullable('summaryStats', '{"items":5}')).toEqual({ items: 5 });
    });
  });

  describe('serializeJsonColumn', () => {
    it('returns the JSON-stringified payload for a valid shape', () => {
      expect(serializeJsonColumn('appliances', ['ninja_creami'])).toBe('["ninja_creami"]');
    });

    it('throws on shape mismatch (write-path is fail-loud)', () => {
      // @ts-expect-error — deliberately passing wrong shape
      expect(() => serializeJsonColumn('appliances', [1, 2])).toThrow();
    });

    it('round-trips: serialize then parse returns the original', () => {
      const original = [
        { slot: 'protein', componentId: 'a', portionMultiplier: 1 },
        { slot: 'base', componentId: 'b', portionMultiplier: 1.25 },
      ];
      const serialized = serializeJsonColumn('componentIds', original);
      const parsed = parseJsonColumn('componentIds', serialized);
      expect(parsed).toEqual(original);
    });
  });

  describe('schema registry', () => {
    it('covers every migrated column (25 names locked)', () => {
      const expected = [
        'pantryLeaningCuisines',
        'appliances',
        'tagsJson',
        'flavorTags',
        'sourceRecipeIds',
        'summaryStats',
        'autoNamedFrom',
        'usedBy',
        'data',
        'cuisineTags',
        'dietaryTags',
        'equipmentNeeded',
        'pantryIngredientNames',
        'compatibilityScores',
        'componentIds',
        'dietaryFlags',
        'bannedComponentIds',
        'attachments',
        'signalsUsed',
        'reasonCodes',
        'failureReasons',
        'dietary',
        'contextSnapshot',
        'candidateIds',
      ];
      const actual = Object.keys(JSON_COLUMN_SCHEMAS).sort();
      expect(actual).toEqual(expected.sort());
    });
  });
});
