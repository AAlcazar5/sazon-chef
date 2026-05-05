// backend/src/services/culturalPrimerService.ts
// ROADMAP 4.0 Tier C10 — Cultural primer layer.
//
// When a user cooks a cuisine for the first time, surface a 60-second
// cultural primer modal. Layers nutritional storytelling alongside cultural
// narrative — culture + nutrition reinforce each other, both serve the
// lifestyle eater.

import { prisma } from '../lib/prisma';

export interface CulturalPrimer {
  title: string;
  body: string;
  nutritionalAngle: string;
}

/**
 * Curated primer library. Each entry must include cultural narrative AND
 * a nutritional angle — not separate features, but the SAME story told
 * through both lenses.
 *
 * Keyed lowercase. v1 priority cuisines covered; expand as needed.
 */
export const CULTURAL_PRIMERS: Record<string, CulturalPrimer> = {
  persian: {
    title: 'Why Persian rice gets fluffed, not stirred',
    body: "Saffron is the soul; tahdig (the crispy bottom) is the prize. Persian rice is steamed, not boiled — and the long, undisturbed final steam is what gives every grain its lift. The barberries on top aren't garnish; they're the bright counterpoint to the saffron's deep warmth.",
    nutritionalAngle:
      'Saffron is rich in manganese; barberries bring vitamin C; this kind of dish is quietly excellent for magnesium when paired with pistachios.',
  },
  salvadorean: {
    title: 'Pupusas, curtido, and a fermentation story',
    body: "El Salvador's pupusa is corn-griddle perfection, but the side dish — curtido — is the secret. Fermented cabbage, carrot, oregano, and chile, served with every meal. It's both the brightness AND the digestion-aid built into the cuisine.",
    nutritionalAngle:
      'Curtido is a probiotic powerhouse: live-fermented cabbage with vitamin K and gut-friendly bacteria. The corn masa brings fiber and natural antioxidants from nixtamalization.',
  },
  burmese: {
    title: 'Tea leaf salad — yes, the leaves are the dish',
    body: "Burmese cuisine sits at the crossroads of India, China, and Thailand — and lahpet thoke (fermented tea leaf salad) is the most uniquely Burmese expression. Crunchy, tangy, deeply savory, and snackable: tea, sesame seeds, peanuts, fried garlic, lime, tomato.",
    nutritionalAngle:
      'Fermented tea leaves are a quiet superfood — antioxidants from the tea, gut-friendly fermentation byproducts, and a complete protein profile when the legumes are layered in.',
  },
  lebanese: {
    title: 'Mezze is a philosophy, not a starter',
    body: "Lebanese mezze isn't an appetizer course — it's the meal itself. A long table of small plates: hummus, baba ghanoush, tabbouleh, fattoush, kibbeh, labneh. Bread is the utensil. The pace is slow on purpose.",
    nutritionalAngle:
      'Mezze is naturally Mediterranean diet-aligned: plant-forward, generous on olive oil, herb-heavy. Tabbouleh is mostly parsley, not bulgur — vitamin K, iron, and folate by the spoonful.',
  },
  ethiopian: {
    title: 'Injera + wot = the most balanced plate on earth',
    body: "Ethiopian injera is a sourdough flatbread made from teff — the world's smallest grain. The stews (wot) are scooped with torn pieces of injera, no utensils. Berbere, the chile-spice blend, gives it depth.",
    nutritionalAngle:
      'Teff is a complete-protein ancient grain, naturally gluten-free, and one of the highest-iron grains on earth. Combined with lentil-based misir wot, this is plant-protein architecture done perfectly.',
  },
  thai: {
    title: 'The four flavors must dance',
    body: "Thai cooking is built around balancing four flavors in every bite: sweet (palm sugar), salty (fish sauce), sour (lime), spicy (chile). When one dominates the dish is unfinished. Add herbs (Thai basil, cilantro, mint) and you have it.",
    nutritionalAngle:
      'Thai herbs are a vitamin powerhouse — basil, cilantro, lime leaves, galangal — antioxidants and trace minerals woven into every dish. Fish sauce adds B12 and umami without volume.',
  },
  ghanaian: {
    title: 'Jollof, suya, and the West African superfood you didn\'t know',
    body: "Ghanaian jollof is one of the great rice dishes — tomato-onion base, scotch bonnet for heat, simmered into a smoky one-pot. Beyond rice, the cuisine leans on grilled lean proteins (suya) and groundnut-based stews (peanut soup).",
    nutritionalAngle:
      'Black-eyed peas (red red) are a fiber + plant-protein staple; groundnuts (peanuts) bring healthy fats; collards and bitter greens push iron and folate.',
  },
  filipino: {
    title: 'Adobo: the most-named dish, no two recipes alike',
    body: "Adobo isn't a recipe — it's a technique. Vinegar + soy + garlic + bay + peppercorns, applied to anything (chicken, pork, tofu, vegetables, fish). Every Filipino household has a version, and they argue.",
    nutritionalAngle:
      'The vinegar is more than flavor — it lowers glycemic response when paired with rice. The technique requires no added oil; the sauce reduces to a thick lacquer through evaporation alone.',
  },
  okinawan: {
    title: 'Eat until 80% full — and live to 100',
    body: 'Okinawa is a Blue Zone — one of the few places on earth where centenarians outnumber the global average many times over. Hara hachi bu (eat until 80% full) is built into the meal pace. Goya (bitter melon), purple sweet potato, tofu, seaweed.',
    nutritionalAngle:
      'Bitter melon is one of the few foods with documented insulin-mimicking compounds. Purple sweet potato is loaded with anthocyanins. Seaweed brings iodine and trace minerals.',
  },
  cajun: {
    title: 'The holy trinity is the foundation, the roux is the soul',
    body: "Cajun cooking starts with onion + celery + bell pepper (the holy trinity). The roux — flour browned in fat — is patience: stir constantly for 20-40 minutes until it's the color you want. Light blonde to dark chocolate, each adds a different layer to gumbo, étouffée, or jambalaya.",
    nutritionalAngle:
      'Crawfish + andouille + okra + dirty rice — Cajun food is naturally protein-dense. Okra brings soluble fiber; the dark roux develops Maillard flavors that deepen perceived umami without added salt.',
  },
};

export function getCulturalPrimer(cuisine: string | null | undefined): CulturalPrimer | null {
  if (!cuisine || typeof cuisine !== 'string') return null;
  const key = cuisine.trim().toLowerCase();
  return CULTURAL_PRIMERS[key] ?? null;
}

export interface IsFirstCookInput {
  userId: string;
  cuisine: string;
  asOfDate: Date;
}

/**
 * Returns true iff this is the user's FIRST cook of the named cuisine — i.e.,
 * there is no prior CookingLog for that user with the same cuisine before
 * `asOfDate`.
 */
export async function isFirstCookOfCuisine(input: IsFirstCookInput): Promise<boolean> {
  if (!input.cuisine || input.cuisine.length === 0) return false;
  const count = (await (prisma as any).cookingLog.count({
    where: {
      userId: input.userId,
      cookedAt: { lt: input.asOfDate },
      recipe: { cuisine: input.cuisine },
    },
  })) as number;
  return count === 0;
}
