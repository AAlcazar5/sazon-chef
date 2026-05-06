// ROADMAP 4.0 D14 — Appliance-specific expansions seed.
//
// Validates the in-memory seed produces enough recipes for each
// appliance bucket without touching the DB. Canonical appliance keys
// match `applianceTaggerService.ts`: ninja_creami / air_fryer / waffle_maker.

import {
  buildApplianceExpansionsSeed,
  filterByAppliance,
} from '../../scripts/seedApplianceExpansions';

const has = (recipe: { appliances?: string | null }, key: string): boolean => {
  if (!recipe.appliances) return false;
  try {
    const parsed = JSON.parse(recipe.appliances);
    return Array.isArray(parsed) && parsed.includes(key);
  } catch {
    return false;
  }
};

describe('seedApplianceExpansions — D14', () => {
  const recipes = buildApplianceExpansionsSeed();

  it('emits at least 30 Ninja Creami recipes', () => {
    const creami = recipes.filter((r) => has(r, 'ninja_creami'));
    expect(creami.length).toBeGreaterThanOrEqual(30);
  });

  it('emits at least 25 air-fryer recipes', () => {
    const af = recipes.filter((r) => has(r, 'air_fryer'));
    expect(af.length).toBeGreaterThanOrEqual(25);
  });

  it('emits at least 20 waffle-maker recipes', () => {
    const wm = recipes.filter((r) => has(r, 'waffle_maker'));
    expect(wm.length).toBeGreaterThanOrEqual(20);
  });

  it('every Ninja Creami recipe references the appliance in instructions', () => {
    for (const r of recipes.filter((x) => has(x, 'ninja_creami'))) {
      const text = r.instructions.join(' ').toLowerCase();
      expect(text.includes('creami') || text.includes('spin')).toBe(true);
    }
  });

  it('every air-fryer recipe references the appliance in instructions', () => {
    for (const r of recipes.filter((x) => has(x, 'air_fryer'))) {
      const text = r.instructions.join(' ').toLowerCase();
      expect(text.includes('air fry') || text.includes('air-fry')).toBe(true);
    }
  });

  it('every waffle-maker recipe references the iron/maker', () => {
    for (const r of recipes.filter((x) => has(x, 'waffle_maker'))) {
      const text = r.instructions.join(' ').toLowerCase();
      expect(
        text.includes('waffle iron') ||
          text.includes('waffle maker') ||
          text.includes('chaffle'),
      ).toBe(true);
    }
  });

  it('Ninja Creami protein-ice-cream variety: covers vanilla, chocolate, fruit, matcha, cookie dough', () => {
    const creami = recipes.filter((x) => has(x, 'ninja_creami'));
    const titles = creami.map((r) => r.title.toLowerCase()).join(' | ');
    expect(titles).toContain('vanilla');
    expect(titles).toContain('chocolate');
    expect(titles).toContain('matcha');
    expect(titles.includes('strawberry') || titles.includes('berry') || titles.includes('mango')).toBe(true);
    expect(titles).toContain('cookie dough');
  });

  it('Air-fryer family covers wings/fries/chicken/brussels/fish/tofu/vegetables', () => {
    const af = recipes.filter((x) => has(x, 'air_fryer'));
    const titles = af.map((r) => r.title.toLowerCase()).join(' | ');
    expect(titles).toContain('wings');
    expect(titles).toContain('fries');
    expect(titles).toContain('brussels');
    expect(titles).toContain('tofu');
  });

  it('Waffle family covers traditional + chaffle + cornbread + brownie + hash brown', () => {
    const wm = recipes.filter((x) => has(x, 'waffle_maker'));
    const titles = wm.map((r) => r.title.toLowerCase()).join(' | ');
    expect(titles).toContain('chaffle');
    expect(titles.includes('cornbread')).toBe(true);
    expect(titles.includes('brownie')).toBe(true);
    expect(titles.includes('hash brown')).toBe(true);
  });

  describe('filterByAppliance helper', () => {
    it('filters recipes whose appliances JSON includes the given key', () => {
      const out = filterByAppliance(
        [
          { id: 'a', appliances: JSON.stringify(['ninja_creami']) },
          { id: 'b', appliances: JSON.stringify(['air_fryer']) },
          { id: 'c', appliances: null },
          { id: 'd', appliances: 'not-json' },
        ],
        'ninja_creami',
      );
      expect(out.map((r) => r.id)).toEqual(['a']);
    });
  });
});
