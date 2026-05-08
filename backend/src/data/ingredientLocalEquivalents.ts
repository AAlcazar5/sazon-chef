// backend/src/data/ingredientLocalEquivalents.ts
// ROADMAP 4.0 I2.1 — Local-equivalent seed data (L0 manual map).
//
// JSON-shaped data file shipped in source. Native-speaker review happens
// via PR comments on this file. When the table grows beyond ~500 entries
// across locales, promote to a Prisma model (`ingredient_local_equivalents`)
// — the schema is already designed in the I2.1 roadmap entry. The service
// layer exposes the same `LocalEquivalent` interface either way, so the
// migration is invisible to callers.
//
// Editorial rules for adding entries:
//   - `canonical` is the en-US lowercase normalized name (the same key
//     IngredientFDCMapping uses for its FDC join).
//   - `localName` is what a *native speaker in that locale* would call
//     this at the market. NOT the literal translation.
//   - `availabilityTier`:
//     - 'common'    — most major supermarkets stock it year-round
//     - 'specialty' — specialty grocer / Latin market / Asian market only
//     - 'rare'      — order online or substitute
//   - `localSubstitute` is the everyday-pantry sub the user can grab
//     when the real thing is unavailable. Skip the field if the canonical
//     is itself the universal sub.
//   - `notes` is one short sentence; never paragraph-length.
//
// What this file is NOT:
//   - Not a translation table for arbitrary text (use i18n bundles).
//   - Not a recipe-rendering rule (that's I2.2 — uses these as a source).
//   - Not LLM-generated. Hallucinated produce names are worse than English-only.

export type AvailabilityTier = 'common' | 'specialty' | 'rare';

export interface LocalEquivalent {
  /** Normalized canonical (lowercase, accent-stripped). */
  canonical: string;
  /** BCP 47 locale tag, e.g. 'es-MX', 'pt-BR', 'en-US'. */
  locale: string;
  /** What a native speaker calls this at the market. */
  localName: string;
  /** Everyday substitute when the real thing isn't on the shelf. */
  localSubstitute?: string;
  availabilityTier: AvailabilityTier;
  notes?: string;
}

// ─── Starter set ───────────────────────────────────────────────────────────
//
// ~30 high-confidence entries across en-US, es-MX, pt-BR. Intentionally
// small — the value is in the *system*, not the catalog density. Native
// speakers extend this incrementally per PR. Coverage matrix is uneven by
// design: an ingredient like huitlacoche is core to Mexican cooking but
// genuinely specialty in the US.

export const STARTER_LOCAL_EQUIVALENTS: ReadonlyArray<LocalEquivalent> = [
  // ─── kale ────────────────────────────────────────────────────────────────
  { canonical: 'kale', locale: 'en-US', localName: 'kale', availabilityTier: 'common' },
  {
    canonical: 'kale',
    locale: 'pt-BR',
    localName: 'couve manteiga',
    availabilityTier: 'common',
    notes: 'Brazilian "couve" is the standard cooking green; sweeter, softer than US kale.',
  },
  {
    canonical: 'kale',
    locale: 'es-MX',
    localName: 'kale',
    localSubstitute: 'acelga',
    availabilityTier: 'specialty',
    notes: 'Mostly seen in Mexico City supermarkets; acelga (chard) is the everyday sub.',
  },

  // ─── huitlacoche (corn smut, Mexican delicacy) ───────────────────────────
  {
    canonical: 'huitlacoche',
    locale: 'es-MX',
    localName: 'huitlacoche',
    availabilityTier: 'common',
    notes: 'Sold canned year-round; fresh in summer at street markets.',
  },
  {
    canonical: 'huitlacoche',
    locale: 'en-US',
    localName: 'huitlacoche',
    localSubstitute: 'roasted poblano + cremini mushrooms',
    availabilityTier: 'specialty',
    notes: 'Canned at Latin markets; rare fresh outside CA/TX.',
  },
  {
    canonical: 'huitlacoche',
    locale: 'pt-BR',
    localName: 'huitlacoche',
    localSubstitute: 'cogumelo paris + pimentão assado',
    availabilityTier: 'rare',
  },

  // ─── tomatillo ───────────────────────────────────────────────────────────
  {
    canonical: 'tomatillo',
    locale: 'es-MX',
    localName: 'tomate verde',
    availabilityTier: 'common',
    notes: 'Just "tomate verde" — the unripe red tomato is "jitomate verde."',
  },
  {
    canonical: 'tomatillo',
    locale: 'en-US',
    localName: 'tomatillo',
    availabilityTier: 'common',
  },
  {
    canonical: 'tomatillo',
    locale: 'pt-BR',
    localName: 'tomatillo',
    localSubstitute: 'tomate verde mexicano (mercado importado)',
    availabilityTier: 'rare',
  },

  // ─── cassava / yuca / mandioca ───────────────────────────────────────────
  { canonical: 'cassava', locale: 'en-US', localName: 'yuca', availabilityTier: 'specialty' },
  { canonical: 'cassava', locale: 'es-MX', localName: 'yuca', availabilityTier: 'common' },
  {
    canonical: 'cassava',
    locale: 'pt-BR',
    localName: 'mandioca',
    availabilityTier: 'common',
    notes: 'Also "aipim" in S/SE Brazil; "macaxeira" in NE Brazil — same root.',
  },

  // ─── açaí ────────────────────────────────────────────────────────────────
  {
    canonical: 'acai',
    locale: 'pt-BR',
    localName: 'açaí',
    availabilityTier: 'common',
    notes: 'Frozen pulp at every supermarket; fresh in Norte/Pará only.',
  },
  {
    canonical: 'acai',
    locale: 'en-US',
    localName: 'açaí',
    availabilityTier: 'common',
  },
  {
    canonical: 'acai',
    locale: 'es-MX',
    localName: 'açaí',
    availabilityTier: 'specialty',
  },

  // ─── chayote / christophine ──────────────────────────────────────────────
  {
    canonical: 'chayote',
    locale: 'es-MX',
    localName: 'chayote',
    availabilityTier: 'common',
    notes: 'Year-round; "chayote con espinas" (spiny variant) is sweeter.',
  },
  {
    canonical: 'chayote',
    locale: 'en-US',
    localName: 'chayote',
    localSubstitute: 'zucchini',
    availabilityTier: 'specialty',
  },
  {
    canonical: 'chayote',
    locale: 'pt-BR',
    localName: 'chuchu',
    availabilityTier: 'common',
  },

  // ─── pumpkin / jerimum / abóbora ────────────────────────────────────────
  { canonical: 'pumpkin', locale: 'en-US', localName: 'pumpkin', availabilityTier: 'common' },
  { canonical: 'pumpkin', locale: 'es-MX', localName: 'calabaza', availabilityTier: 'common' },
  {
    canonical: 'pumpkin',
    locale: 'pt-BR',
    localName: 'abóbora',
    availabilityTier: 'common',
    notes: 'Also "jerimum" in NE Brazil — same vegetable.',
  },

  // ─── cilantro / coentro ─────────────────────────────────────────────────
  { canonical: 'cilantro', locale: 'en-US', localName: 'cilantro', availabilityTier: 'common' },
  { canonical: 'cilantro', locale: 'es-MX', localName: 'cilantro', availabilityTier: 'common' },
  { canonical: 'cilantro', locale: 'pt-BR', localName: 'coentro', availabilityTier: 'common' },

  // ─── plantain / plátano / banana-da-terra ───────────────────────────────
  {
    canonical: 'plantain',
    locale: 'en-US',
    localName: 'plantain',
    availabilityTier: 'specialty',
  },
  {
    canonical: 'plantain',
    locale: 'es-MX',
    localName: 'plátano macho',
    availabilityTier: 'common',
  },
  {
    canonical: 'plantain',
    locale: 'pt-BR',
    localName: 'banana-da-terra',
    availabilityTier: 'common',
    notes: 'Also "banana pacovan" in NE Brazil.',
  },

  // ─── black beans ────────────────────────────────────────────────────────
  {
    canonical: 'black beans',
    locale: 'en-US',
    localName: 'black beans',
    availabilityTier: 'common',
  },
  {
    canonical: 'black beans',
    locale: 'es-MX',
    localName: 'frijoles negros',
    availabilityTier: 'common',
  },
  {
    canonical: 'black beans',
    locale: 'pt-BR',
    localName: 'feijão preto',
    availabilityTier: 'common',
    notes: 'Carioca beans (brown) are more common than black outside the Sul/Sudeste feijoada belt.',
  },
];
