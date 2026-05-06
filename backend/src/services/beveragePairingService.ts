// backend/src/services/beveragePairingService.ts
// ROADMAP 4.0 Tier J17.3 — Beverage pairing slot.
//
// Curated mapping: cuisine → 2–3 traditional beverages. The pairing slot
// just IS the beverage — never framed against soda or as an "alternative."
// Voice: persona-grade discovery, never moralized substitution.
//
// Note: this is a separate concern from `drinkPairingService` (which has
// alcoholic + sparkling + hot variants for a richer recipe-detail card).
// J17.3 is the lifestyle-voice "with…" surface for the cultural-fluency
// thread — it intentionally stays small and uneditorialized.

export const BEVERAGE_PAIRINGS: Readonly<Record<string, readonly string[]>> = {
  japanese: ['green tea', 'genmaicha', 'mugicha (barley tea)'],
  mexican: ['agua fresca de jamaica', 'horchata', 'tepache'],
  lebanese: ['ayran', 'tamarind juice', 'mint lemonade'],
  italian: ['Italian sparkling water with lemon', 'espresso', 'chinotto'],
  thai: ['cha yen (Thai iced tea)', 'pandan cooler'],
  vietnamese: ['cà phê sữa đá', 'salted-plum soda', 'fresh coconut'],
  korean: ['barley tea (boricha)', 'sikhye', 'misugaru'],
  indian: ['masala chai', 'lassi', 'jaljeera'],
  greek: ['mountain tea (tsai tou vounou)', 'fresh-squeezed orange'],
  cretan: ['mountain tea (tsai tou vounou)', 'fresh-squeezed orange'],
  persian: ['saffron-honey tea', 'sekanjabin', 'doogh'],
  moroccan: ['mint tea (atay)', 'fresh-squeezed orange', 'almond milk'],
  spanish: ['horchata de chufa', 'fresh-squeezed orange', 'cafe cortado'],
  ethiopian: ['Ethiopian buna (coffee ceremony)', 'sparkling water with lemon'],
  filipino: ['salabat (ginger tea)', 'calamansi cooler'],
  turkish: ['ayran', 'Turkish tea', 'sahlep'],
  okinawan: ['sanpin-cha (jasmine tea)', 'shikuwasa cooler'],
};

/**
 * Returns 2–3 curated traditional beverages for the given cuisine, or an
 * empty array when the cuisine is unknown / blank. Case-insensitive.
 */
export function getPairings(cuisine: string): readonly string[] {
  if (!cuisine || typeof cuisine !== 'string') return [];
  const key = cuisine.trim().toLowerCase();
  if (!key) return [];
  return BEVERAGE_PAIRINGS[key] ?? [];
}
