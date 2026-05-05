// backend/__tests__/services/applianceTaggerService.test.ts
// ROADMAP 4.0 F3.

const mockRecipeFindMany = jest.fn();
const mockRecipeUpdate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: (...a: unknown[]) => mockRecipeFindMany(...a),
      update: (...a: unknown[]) => mockRecipeUpdate(...a),
    },
  },
}));

import {
  APPLIANCES,
  detectAppliances,
  serializeAppliances,
  parseAppliances,
  isValidApplianceKey,
  bulkTagRecipes,
} from '../../src/services/applianceTaggerService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isValidApplianceKey', () => {
  it('accepts canonical keys', () => {
    for (const a of APPLIANCES) {
      expect(isValidApplianceKey(a.key)).toBe(true);
    }
  });
  it('rejects unknown keys', () => {
    expect(isValidApplianceKey('toaster')).toBe(false);
    expect(isValidApplianceKey('')).toBe(false);
  });
});

describe('detectAppliances', () => {
  it('detects ninja_creami from title + body', () => {
    expect(detectAppliances('Protein ice cream in the Ninja Creami')).toContain('ninja_creami');
    expect(detectAppliances('Run the protein base through the creami until smooth')).toContain('ninja_creami');
  });

  it('detects air_fryer across the common spellings', () => {
    expect(detectAppliances('Air Fryer crispy chickpeas')).toContain('air_fryer');
    expect(detectAppliances('Air-fry at 400 for 12 minutes')).toContain('air_fryer');
    expect(detectAppliances('Cook in the airfryer until golden')).toContain('air_fryer');
  });

  it('detects waffle_maker including chaffle', () => {
    expect(detectAppliances('Pour batter into the waffle iron')).toContain('waffle_maker');
    expect(detectAppliances('Crispy chaffle base')).toContain('waffle_maker');
  });

  it('detects instant_pot via instant pot, instapot, pressure cooker', () => {
    expect(detectAppliances('Set the Instant Pot to 30 minutes')).toContain('instant_pot');
    expect(detectAppliances('Use a pressure cooker for the beans')).toContain('instant_pot');
  });

  it('detects multiple appliances and preserves canonical order', () => {
    const found = detectAppliances('Cook protein in the Ninja Creami, then air-fry the topping');
    // ninja_creami comes before air_fryer in APPLIANCES, so order matches.
    expect(found).toEqual(['ninja_creami', 'air_fryer']);
  });

  it('returns empty for unrelated text', () => {
    expect(detectAppliances('Stovetop pasta with garlic')).toEqual([]);
    expect(detectAppliances('')).toEqual([]);
  });

  it('does not duplicate when multiple triggers fire for the same appliance', () => {
    const found = detectAppliances('Ninja Creami protein ice cream — creami until smooth');
    expect(found).toEqual(['ninja_creami']);
  });

  it('case-insensitive', () => {
    expect(detectAppliances('AIR FRYER chickpeas')).toContain('air_fryer');
    expect(detectAppliances('NINJA CREAMI')).toContain('ninja_creami');
  });
});

describe('serializeAppliances / parseAppliances round-trip', () => {
  it('round-trips a non-empty list', () => {
    const json = serializeAppliances(['ninja_creami', 'air_fryer']);
    expect(json).toBe('["ninja_creami","air_fryer"]');
    expect(parseAppliances(json)).toEqual(['ninja_creami', 'air_fryer']);
  });

  it('serializes empty list to null', () => {
    expect(serializeAppliances([])).toBeNull();
  });

  it('parseAppliances filters out unknown / malformed entries', () => {
    expect(parseAppliances('["air_fryer","unknown_thing"]')).toEqual(['air_fryer']);
    expect(parseAppliances('not json')).toEqual([]);
    expect(parseAppliances(null)).toEqual([]);
    expect(parseAppliances('')).toEqual([]);
    expect(parseAppliances('{"not":"array"}')).toEqual([]);
  });
});

describe('bulkTagRecipes', () => {
  it('writes detected keys back to recipes that contain triggers', async () => {
    mockRecipeFindMany.mockResolvedValueOnce([
      {
        id: 'r1',
        title: 'Air Fryer chickpeas',
        description: '',
        instructions: [{ text: 'Air-fry at 400°F for 12 min' }],
      },
      {
        id: 'r2',
        title: 'Stovetop carbonara',
        description: '',
        instructions: [{ text: 'Cook pasta in salted water' }],
      },
      {
        id: 'r3',
        title: 'Ninja Creami protein bowl',
        description: 'High-protein ice cream',
        instructions: [{ text: 'Process in the creami until smooth' }],
      },
    ]);

    const result = await bulkTagRecipes();
    expect(result.scanned).toBe(3);
    expect(result.tagged).toBe(2);

    expect(mockRecipeUpdate).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { appliances: '["air_fryer"]' },
    });
    expect(mockRecipeUpdate).toHaveBeenCalledWith({
      where: { id: 'r3' },
      data: { appliances: '["ninja_creami"]' },
    });
    // r2 has no triggers — never updated.
    const updatedIds = mockRecipeUpdate.mock.calls.map(c => (c[0] as { where: { id: string } }).where.id);
    expect(updatedIds).not.toContain('r2');
  });

  it('with onlyMissing=true, query filters appliances=null', async () => {
    mockRecipeFindMany.mockResolvedValueOnce([]);
    await bulkTagRecipes({ onlyMissing: true });
    const call = mockRecipeFindMany.mock.calls[0][0];
    expect(call.where).toEqual({ appliances: null });
  });

  it('continues when one update fails', async () => {
    mockRecipeFindMany.mockResolvedValueOnce([
      { id: 'r1', title: 'Air fryer wings', description: '', instructions: [] },
      { id: 'r2', title: 'Ninja Creami sorbet', description: '', instructions: [] },
    ]);
    mockRecipeUpdate.mockRejectedValueOnce(new Error('boom'));
    mockRecipeUpdate.mockResolvedValueOnce({});
    const result = await bulkTagRecipes();
    expect(result.scanned).toBe(2);
    expect(result.tagged).toBe(1); // only r2 succeeded
  });
});
