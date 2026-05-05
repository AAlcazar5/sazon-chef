// backend/__tests__/services/culturalPrimerService.test.ts
// ROADMAP 4.0 Tier C10 — Cultural primer layer (TDD).

import {
  isFirstCookOfCuisine,
  getCulturalPrimer,
  CULTURAL_PRIMERS,
} from '../../src/services/culturalPrimerService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.cookingLog) {
    mockPrisma.cookingLog = { findFirst: jest.fn(), count: jest.fn() };
  } else {
    mockPrisma.cookingLog.findFirst = jest.fn();
    mockPrisma.cookingLog.count = jest.fn();
  }
});

describe('CULTURAL_PRIMERS — content library', () => {
  it('exposes a non-empty primer library', () => {
    expect(Object.keys(CULTURAL_PRIMERS).length).toBeGreaterThan(0);
  });

  it('every primer has a title + body + nutritionalAngle', () => {
    for (const [cuisine, primer] of Object.entries(CULTURAL_PRIMERS)) {
      expect(typeof primer.title).toBe('string');
      expect(primer.title.length).toBeGreaterThan(0);
      expect(typeof primer.body).toBe('string');
      expect(primer.body.length).toBeGreaterThan(20);
      expect(typeof primer.nutritionalAngle).toBe('string');
      expect(primer.nutritionalAngle.length).toBeGreaterThan(0);
      expect(cuisine).toBe(cuisine.toLowerCase());
    }
  });

  it('includes priority v1 cuisines (Persian, Salvadorean, Burmese, Lebanese, Ethiopian)', () => {
    expect(CULTURAL_PRIMERS).toHaveProperty('persian');
    expect(CULTURAL_PRIMERS).toHaveProperty('salvadorean');
    expect(CULTURAL_PRIMERS).toHaveProperty('burmese');
    expect(CULTURAL_PRIMERS).toHaveProperty('lebanese');
    expect(CULTURAL_PRIMERS).toHaveProperty('ethiopian');
  });
});

describe('getCulturalPrimer', () => {
  it('returns the primer for a known cuisine', () => {
    const p = getCulturalPrimer('Persian');
    expect(p).not.toBeNull();
    expect(p?.title.toLowerCase()).toMatch(/persian|saffron|tahdig/);
  });

  it('is case-insensitive', () => {
    expect(getCulturalPrimer('PERSIAN')).not.toBeNull();
    expect(getCulturalPrimer('persian')).not.toBeNull();
    expect(getCulturalPrimer('Persian')).not.toBeNull();
  });

  it('returns null for an unknown cuisine', () => {
    expect(getCulturalPrimer('Atlantean')).toBeNull();
  });

  it('returns null for empty / null input', () => {
    expect(getCulturalPrimer('')).toBeNull();
    expect(getCulturalPrimer(null as any)).toBeNull();
    expect(getCulturalPrimer(undefined as any)).toBeNull();
  });
});

describe('isFirstCookOfCuisine', () => {
  it('returns true when there is no prior cook of that cuisine before today', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    const result = await isFirstCookOfCuisine({
      userId: 'u1',
      cuisine: 'Persian',
      asOfDate: new Date('2026-05-04T17:00:00Z'),
    });
    expect(result).toBe(true);
    const args = mockPrisma.cookingLog.count.mock.calls[0][0];
    expect(args.where.userId).toBe('u1');
    expect(args.where.recipe.cuisine).toBe('Persian');
    expect(args.where.cookedAt.lt.getTime()).toBe(new Date('2026-05-04T17:00:00Z').getTime());
  });

  it('returns false when the user has cooked this cuisine before', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(1);
    const result = await isFirstCookOfCuisine({
      userId: 'u1',
      cuisine: 'Persian',
      asOfDate: new Date(),
    });
    expect(result).toBe(false);
  });

  it('passes an exclusive `lt` upper bound (today\'s cook itself does not count)', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    const asOf = new Date('2026-05-04T17:00:00Z');
    await isFirstCookOfCuisine({ userId: 'u1', cuisine: 'Burmese', asOfDate: asOf });
    const args = mockPrisma.cookingLog.count.mock.calls[0][0];
    expect(args.where.cookedAt.lt).toBeInstanceOf(Date);
  });

  it('returns false (skip primer) for empty cuisine input', async () => {
    const result = await isFirstCookOfCuisine({
      userId: 'u1',
      cuisine: '',
      asOfDate: new Date(),
    });
    expect(result).toBe(false);
    expect(mockPrisma.cookingLog.count).not.toHaveBeenCalled();
  });
});
