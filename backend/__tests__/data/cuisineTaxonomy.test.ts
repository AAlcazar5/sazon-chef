// backend/__tests__/data/cuisineTaxonomy.test.ts
// ROADMAP 4.0 Tier D3 — Cuisine taxonomy collapse.

import {
  CUISINES,
  resolveCuisine,
  listCanonicals,
  listAllCanonicals,
  findByCanonical,
} from '../../src/data/cuisineTaxonomy';

describe('cuisine taxonomy structure', () => {
  it('every canonical has lowercase slug + non-empty displayName + region', () => {
    for (const c of CUISINES) {
      expect(c.canonical).toMatch(/^[a-z0-9_]+$/);
      expect(c.displayName.length).toBeGreaterThan(0);
      expect(c.region.length).toBeGreaterThan(0);
    }
  });

  it('canonicals are unique', () => {
    const slugs = CUISINES.map((c) => c.canonical);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every sub-cuisine references its parent canonical', () => {
    const canonicals = new Set(CUISINES.map((c) => c.canonical));
    for (const c of CUISINES) {
      for (const s of c.subCuisines) {
        expect(canonicals.has(s.parentCanonical)).toBe(true);
        expect(s.parentCanonical).toBe(c.canonical);
      }
    }
  });

  it('sub-cuisine slugs are unique within their parent', () => {
    for (const c of CUISINES) {
      const slugs = c.subCuisines.map((s) => s.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it('contains ≥60 active canonicals (the breadth target)', () => {
    expect(listCanonicals().length).toBeGreaterThanOrEqual(60);
  });

  it('contains 5 deprecated umbrella canonicals (mediterranean/asian/middle_eastern/north_african/latin_american)', () => {
    const deprecated = listAllCanonicals().filter((c) => c.deprecated);
    expect(deprecated.map((c) => c.canonical).sort()).toEqual([
      'asian',
      'latin_american',
      'mediterranean',
      'middle_eastern',
      'north_african',
    ]);
  });
});

describe('regional spec — load-bearing canonicals + sub-cuisines', () => {
  it('Mexican has 7 sub-cuisines including Michoacán', () => {
    const mexican = findByCanonical('mexican');
    expect(mexican).not.toBeNull();
    expect(mexican!.subCuisines).toHaveLength(7);
    expect(mexican!.subCuisines.find((s) => s.slug === 'michoacan')).toBeDefined();
  });

  it('Italian has 6 sub-cuisines including Roman + Sicilian + Sardinian', () => {
    const italian = findByCanonical('italian');
    expect(italian!.subCuisines).toHaveLength(6);
    const slugs = italian!.subCuisines.map((s) => s.slug);
    expect(slugs).toContain('roman');
    expect(slugs).toContain('sicilian');
    expect(slugs).toContain('sardinian');
    expect(slugs).not.toContain('italian_american');
  });

  it('Chinese has 6 sub-cuisines including Sichuan + Cantonese', () => {
    const chinese = findByCanonical('chinese');
    expect(chinese!.subCuisines).toHaveLength(6);
    const slugs = chinese!.subCuisines.map((s) => s.slug);
    expect(slugs).toContain('sichuan');
    expect(slugs).toContain('cantonese');
  });

  it('Indian has 8 sub-cuisines including Bengali + Goan + Hyderabadi', () => {
    const indian = findByCanonical('indian');
    expect(indian!.subCuisines).toHaveLength(8);
  });

  it('American has 10 sub-cuisines (Soul Food / Cajun-Creole / Tex-Mex / Southern / Italian-American / etc.)', () => {
    const american = findByCanonical('american');
    expect(american!.subCuisines).toHaveLength(10);
    const slugs = american!.subCuisines.map((s) => s.slug);
    expect(slugs).toContain('soul_food');
    expect(slugs).toContain('cajun_creole');
    expect(slugs).toContain('tex_mex');
    expect(slugs).toContain('southern');
    expect(slugs).toContain('italian_american');
  });

  it('Levantine carries Lebanese + Syrian + Palestinian + Jordanian as subs (not separate canonicals)', () => {
    const lev = findByCanonical('levantine');
    expect(lev!.subCuisines.map((s) => s.slug).sort()).toEqual([
      'jordanian',
      'lebanese',
      'palestinian',
      'syrian',
    ]);
  });

  it('Sub-Saharan Africa keeps Ethiopian + Eritrean + Senegalese as distinct canonicals (breadth-protecting)', () => {
    expect(findByCanonical('ethiopian')).not.toBeNull();
    expect(findByCanonical('eritrean')).not.toBeNull();
    expect(findByCanonical('senegalese')).not.toBeNull();
  });
});

describe('resolveCuisine', () => {
  it('returns null for empty input', () => {
    expect(resolveCuisine('')).toBeNull();
    expect(resolveCuisine('   ')).toBeNull();
  });

  it('resolves canonical slug', () => {
    const r = resolveCuisine('persian');
    expect(r).toEqual({
      canonical: 'persian',
      subCuisine: null,
      deprecated: false,
    });
  });

  it('resolves display name (case-insensitive)', () => {
    expect(resolveCuisine('Persian')!.canonical).toBe('persian');
    expect(resolveCuisine('PERSIAN')!.canonical).toBe('persian');
  });

  it('resolves alias to canonical', () => {
    expect(resolveCuisine('iranian')!.canonical).toBe('persian');
    expect(resolveCuisine('Italy')!.canonical).toBe('italian');
    expect(resolveCuisine('Cambodia')!.canonical).toBe('khmer');
  });

  it('resolves sub-cuisine to its canonical + slug', () => {
    const r = resolveCuisine('michoacan');
    expect(r).toEqual({
      canonical: 'mexican',
      subCuisine: 'michoacan',
      deprecated: false,
    });
  });

  it('resolves sub-cuisine display name with diacritics (Michoacán → michoacan)', () => {
    const r = resolveCuisine('Michoacán');
    expect(r?.canonical).toBe('mexican');
    expect(r?.subCuisine).toBe('michoacan');
  });

  it('resolves "Soul Food" → american + soul_food', () => {
    const r = resolveCuisine('Soul Food');
    expect(r).toEqual({
      canonical: 'american',
      subCuisine: 'soul_food',
      deprecated: false,
    });
  });

  it('resolves "Tex-Mex" with hyphen → american + tex_mex', () => {
    const r = resolveCuisine('Tex-Mex');
    expect(r?.canonical).toBe('american');
    expect(r?.subCuisine).toBe('tex_mex');
  });

  it('resolves deprecated umbrellas with deprecated: true flag', () => {
    expect(resolveCuisine('Mediterranean')).toEqual({
      canonical: 'mediterranean',
      subCuisine: null,
      deprecated: true,
    });
    expect(resolveCuisine('Latin-Inspired')).toEqual({
      canonical: 'latin_american',
      subCuisine: null,
      deprecated: true,
    });
  });

  it('resolves "Cajun" → american + cajun_creole (sub alias)', () => {
    expect(resolveCuisine('Cajun')).toEqual({
      canonical: 'american',
      subCuisine: 'cajun_creole',
      deprecated: false,
    });
  });

  it('resolves "Italian-American" → american + italian_american (US regional style, not europe)', () => {
    expect(resolveCuisine('Italian-American')).toEqual({
      canonical: 'american',
      subCuisine: 'italian_american',
      deprecated: false,
    });
    expect(resolveCuisine('Italian American')!.canonical).toBe('american');
  });

  it('resolves "American Southern" → american + southern (sub alias)', () => {
    expect(resolveCuisine('American Southern')).toEqual({
      canonical: 'american',
      subCuisine: 'southern',
      deprecated: false,
    });
  });

  it('resolves "Belgian" → belgian canonical (own bucket, not folded into french)', () => {
    expect(resolveCuisine('Belgian')).toEqual({
      canonical: 'belgian',
      subCuisine: null,
      deprecated: false,
    });
    expect(resolveCuisine('Belgium')!.canonical).toBe('belgian');
  });

  it('returns null for genuinely unknown input', () => {
    expect(resolveCuisine('Klingon Imperial Cuisine')).toBeNull();
  });

  it('is idempotent — re-resolving same input gives same result', () => {
    const a = resolveCuisine('Persian');
    const b = resolveCuisine('Persian');
    expect(a).toEqual(b);
  });
});

describe('coverage of legacy DB cuisine values', () => {
  // 33 distinct cuisine strings observed in the live SQLite DB as of D3.
  const LIVE_DB_CUISINES = [
    'American',
    'Mediterranean',
    'Mexican',
    'Japanese',
    'Asian',
    'Italian',
    'Indian',
    'Thai',
    'Chinese',
    'Korean',
    'Middle Eastern',
    'Brazilian',
    'Colombian',
    'Cuban',
    'Ethiopian',
    'Filipino',
    'French',
    'Ghanaian',
    'Greek',
    'Nigerian',
    'North African',
    'Okinawan',
    'Persian',
    'Puerto Rican',
    'Salvadorean',
    'Soul Food',
    'Spanish',
    'Tex-Mex',
    'Turkish',
    'Vietnamese',
    'Lebanese',
    'Peruvian',
    'Latin-Inspired',
  ];

  it('every legacy DB cuisine resolves to a canonical (no orphans)', () => {
    const orphans: string[] = [];
    for (const legacy of LIVE_DB_CUISINES) {
      const r = resolveCuisine(legacy);
      if (!r) orphans.push(legacy);
    }
    expect(orphans).toEqual([]);
  });
});
