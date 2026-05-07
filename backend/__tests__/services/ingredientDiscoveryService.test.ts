// ROADMAP 4.0 IG8.1 — ingredientDiscoveryService test.

import { prisma } from '../../src/lib/prisma';
import {
  pickWeeklyDiscovery,
  CULTURAL_DISCOVERY_INGREDIENTS,
  __INTERNALS,
} from '../../src/services/ingredientDiscoveryService';

const cookFindMany = jest.fn();
const eventFindMany = jest.fn();
const recommenderFindMany = jest.fn();
const recipeFindMany = jest.fn();

(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  findMany: cookFindMany,
};
(prisma as any).ingredientEvent = {
  ...((prisma as any).ingredientEvent ?? {}),
  findMany: eventFindMany,
};
(prisma as any).recommenderEvent = {
  ...((prisma as any).recommenderEvent ?? {}),
  findMany: recommenderFindMany,
};
(prisma as any).recipe = {
  ...((prisma as any).recipe ?? {}),
  findMany: recipeFindMany,
};

const NOW = new Date('2026-05-06T12:00:00Z');
const dayOffset = (d: number) => new Date(NOW.getTime() + d * 86400000);

beforeEach(() => {
  cookFindMany.mockReset();
  eventFindMany.mockReset();
  recommenderFindMany.mockReset();
  recipeFindMany.mockReset();
  cookFindMany.mockResolvedValue([]);
  eventFindMany.mockResolvedValue([]);
  recommenderFindMany.mockResolvedValue([]);
  recipeFindMany.mockResolvedValue([]);
});

describe('IG8.1 — input guards', () => {
  it('returns null for empty userId', async () => {
    expect(await pickWeeklyDiscovery({ userId: '' })).toBeNull();
  });
});

describe('IG8.1 — CULTURAL_DISCOVERY_INGREDIENTS map', () => {
  it('keys are lowercase cuisine names', () => {
    for (const k of Object.keys(CULTURAL_DISCOVERY_INGREDIENTS)) {
      expect(k).toBe(k.toLowerCase());
    }
  });

  it('contains the launch priority cuisines', () => {
    expect(CULTURAL_DISCOVERY_INGREDIENTS.persian).toBe('sumac');
    expect(CULTURAL_DISCOVERY_INGREDIENTS.lebanese).toBe("za'atar");
    expect(CULTURAL_DISCOVERY_INGREDIENTS.ethiopian).toBe('berbere');
    expect(CULTURAL_DISCOVERY_INGREDIENTS.thai).toBe('makrut lime');
  });
});

describe('IG8.1 — pickWeeklyDiscovery', () => {
  it('returns the first eligible candidate when user has no Persian/Lebanese/etc cook history', async () => {
    cookFindMany.mockResolvedValue([
      { recipe: { cuisine: 'Italian' } }, // user only cooks Italian
    ]);
    recipeFindMany.mockResolvedValue([
      { id: 'r-fattoush', title: 'Fattoush', cookTime: 25 },
    ]);
    const out = await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    expect(out).not.toBeNull();
    // First eligible cuisine in map is "persian" → sumac
    expect(out!.ingredient).toBe('sumac');
    expect(out!.cuisine).toBe('persian');
    // Cultural primer surfaces (Persian primer is in the seeded library)
    expect(out!.primerTitle).not.toBeNull();
    // Recipe pairing surfaces
    expect(out!.recipeId).toBe('r-fattoush');
  });

  it('skips cuisines the user has cooked from in the last 30 days', async () => {
    cookFindMany.mockResolvedValue([
      { recipe: { cuisine: 'Persian' } }, // cooked Persian → skip sumac
      { recipe: { cuisine: 'Italian' } },
    ]);
    recipeFindMany.mockResolvedValue([
      { id: 'r-tabouli', title: 'Tabouli', cookTime: 20 },
    ]);
    const out = await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    expect(out).not.toBeNull();
    // Next eligible cuisine is "lebanese" → za'atar
    expect(out!.cuisine).toBe('lebanese');
    expect(out!.ingredient).toBe("za'atar");
  });

  it('skips ingredients the user has any IngredientEvent for', async () => {
    eventFindMany.mockResolvedValue([
      { ingredientName: 'sumac' }, // user already used sumac → skip
    ]);
    recipeFindMany.mockResolvedValue([
      { id: 'r-tabouli', title: 'Tabouli', cookTime: 20 },
    ]);
    const out = await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    expect(out!.ingredient).not.toBe('sumac');
  });

  it('skips ingredients suggested within the 60-day cooldown', async () => {
    recommenderFindMany.mockResolvedValue([
      {
        asOf: dayOffset(-30),
        contextSnapshot: JSON.stringify({
          surface: 'pantry_iq',
          metadata: { kind: 'cultural-discovery', suggestedItem: 'sumac' },
        }),
      },
    ]);
    recipeFindMany.mockResolvedValue([
      { id: 'r-tabouli', title: 'Tabouli', cookTime: 20 },
    ]);
    const out = await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    expect(out!.ingredient).not.toBe('sumac');
  });

  it('honors cooldown only for cultural-discovery rows (not other pantry_iq events)', async () => {
    // pantry_iq surface but a different metadata.kind → should NOT trigger cooldown
    recommenderFindMany.mockResolvedValue([
      {
        asOf: dayOffset(-10),
        contextSnapshot: JSON.stringify({
          surface: 'pantry_iq',
          metadata: { kind: 'something-else', suggestedItem: 'sumac' },
        }),
      },
    ]);
    recipeFindMany.mockResolvedValue([
      { id: 'r-fattoush', title: 'Fattoush', cookTime: 25 },
    ]);
    const out = await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    expect(out!.ingredient).toBe('sumac');
  });

  it('returns null when every candidate is filtered (cooked-or-used-or-cooldown)', async () => {
    // Pretend the user has already explored everything
    cookFindMany.mockResolvedValue([
      { recipe: { cuisine: 'Persian' } },
      { recipe: { cuisine: 'Lebanese' } },
      { recipe: { cuisine: 'Ethiopian' } },
      { recipe: { cuisine: 'Burmese' } },
      { recipe: { cuisine: 'Thai' } },
      { recipe: { cuisine: 'Ghanaian' } },
      { recipe: { cuisine: 'Filipino' } },
      { recipe: { cuisine: 'Okinawan' } },
      { recipe: { cuisine: 'Cajun' } },
      { recipe: { cuisine: 'Salvadorean' } },
    ]);
    const out = await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    expect(out).toBeNull();
  });

  it('returns the candidate with recipeId=null when no recipe pairing found', async () => {
    cookFindMany.mockResolvedValue([{ recipe: { cuisine: 'Italian' } }]);
    recipeFindMany.mockResolvedValue([]); // no matching recipes
    const out = await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    expect(out).not.toBeNull();
    expect(out!.recipeId).toBeNull();
    expect(out!.recipeTitle).toBeNull();
  });

  it('lifestyle voice — primer copy never contains banned vocabulary', async () => {
    cookFindMany.mockResolvedValue([{ recipe: { cuisine: 'Italian' } }]);
    recipeFindMany.mockResolvedValue([]);
    const out = await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    expect(out).not.toBeNull();
    if (out!.primerBody) {
      expect(out!.primerBody.toLowerCase()).not.toContain('you should try');
      expect(out!.primerBody.toLowerCase()).not.toContain('missing');
      expect(out!.primerBody.toLowerCase()).not.toContain('diverse');
    }
  });

  it('case-insensitive cuisine match — "PERSIAN" cooked also blocks sumac', async () => {
    cookFindMany.mockResolvedValue([
      { recipe: { cuisine: 'PERSIAN' } },
    ]);
    recipeFindMany.mockResolvedValue([
      { id: 'r-tabouli', title: 'Tabouli', cookTime: 20 },
    ]);
    const out = await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    expect(out!.cuisine).not.toBe('persian');
  });

  it('queries recipe with cookTime ≤ RECIPE_COOK_TIME_MAX', async () => {
    cookFindMany.mockResolvedValue([{ recipe: { cuisine: 'Italian' } }]);
    recipeFindMany.mockResolvedValue([]);
    await pickWeeklyDiscovery({ userId: 'u1', now: NOW });
    const where = recipeFindMany.mock.calls[0][0].where;
    expect(where.cookTime.lte).toBe(__INTERNALS.RECIPE_COOK_TIME_MAX);
  });

  it('publishes cooldown / lookback / cookTime constants for inspection', () => {
    expect(__INTERNALS.COOLDOWN_DAYS).toBe(60);
    expect(__INTERNALS.COOK_LOOKBACK_DAYS).toBe(30);
    expect(__INTERNALS.RECIPE_COOK_TIME_MAX).toBe(45);
  });
});
