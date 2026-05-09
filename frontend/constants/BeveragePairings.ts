// frontend/constants/BeveragePairings.ts
// ROADMAP 4.0 Tier J17.3 — Beverage pairing slot (frontend mirror).
//
// Mirrors `backend/src/services/beveragePairingService.ts` so the recipe
// detail screen can render the slot without an extra round-trip. Backend
// remains the source of truth — keep these in sync when adding cuisines.

const BEVERAGE_PAIRINGS: Readonly<Record<string, readonly string[]>> = {
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

export function getBeveragePairings(cuisine: string | null | undefined): readonly string[] {
  if (!cuisine || typeof cuisine !== 'string') return [];
  const key = cuisine.trim().toLowerCase();
  if (!key) return [];
  return BEVERAGE_PAIRINGS[key] ?? [];
}
