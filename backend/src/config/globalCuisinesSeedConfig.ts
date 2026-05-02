// backend/src/config/globalCuisinesSeedConfig.ts
// Group 11 Phase 2 — canonical seed config for the expanded global cuisine pool.
//
// This is the data the AI generation pipeline iterates over to seed the recipe
// database. Each entry specifies how many recipes to generate for each cuisine
// plus a healthAngle that gets injected into the AI prompt.
//
// Run via: `npm run seed:ai -- --config global` (the command resolves this file).

import { getHealthTierForCuisine } from '../utils/cuisineHealthTier';
import { getCuisineFamily } from '../utils/cuisineAdjacency';

export interface CuisineTarget {
  name: string;
  recipeCount: number;
  healthAngle: string;
}

const target = (name: string, recipeCount: number, healthAngle: string): CuisineTarget => ({
  name,
  recipeCount,
  healthAngle,
});

// Latin American — break the catch-all into 24 specific national cuisines.
const LATIN_AMERICAN: CuisineTarget[] = [
  target('Puerto Rican', 40, 'Plantain-based, bean-heavy proteins, sofrito as flavor base.'),
  target('Cuban', 35, 'Lean braised proteins, citrus marinades (mojo), bean-forward.'),
  target('Dominican', 30, 'Plantain + bean combos, high fiber.'),
  target('Salvadorean', 30, 'Fermented curtido (gut health), corn-based, bean-filled pupusas.'),
  target('Honduran', 25, 'Bean-heavy, seafood-rich coast, plantain-based.'),
  target('Guatemalan', 25, 'Ancient Mayan ingredients, turkey-based proteins, pepitas.'),
  target('Venezuelan', 30, 'Corn-based arepas, grillable proteins, black bean heavy.'),
  target('Chilean', 25, 'Seafood-rich, corn-based, light stews.'),
  target('Ecuadorean', 25, 'Seafood-forward, potato-based, lime-cured proteins.'),
  target('Uruguayan', 20, 'Lean cuts, chimichurri (herb-based condiment).'),
  target('Haitian', 25, 'Citrus-marinated proteins, fermented pikliz, squash soups.'),
  target('Panamanian', 20, 'Protein-rich soups, seafood, plantain.'),
  target('Nicaraguan', 20, 'Rice + bean protein combo (gallo pinto), banana leaf-wrapped, plantain-based.'),
  target('Costa Rican', 20, '"Casado" (married plate) = balanced macro plate by design — rice, beans, protein, salad, plantain.'),
  target('Bolivian', 20, 'Peanut soups, quinoa (native grain), high-altitude sustenance dishes.'),
  target('Paraguayan', 15, 'Corn + cheese protein combos, cassava-based, hearty soups.'),
  target('Guyanese', 20, 'One-pot coconut stews, Indian-Caribbean fusion, bean-heavy.'),
  target('Belizean', 15, 'Coconut rice & beans (complete protein), stewed lean proteins, cassava-based.'),
  target('Surinamese', 15, 'World-fusion cuisine (Indian-Indonesian-African-Dutch), turmeric-rich soups.'),
  target('Colombian', 25, 'Arepas, tropical fruits, ajiaco soup tradition, bean-forward.'),
  target('Brazilian', 30, 'Feijoada bean stews, açaí superfruit, grilled proteins (churrasco).'),
  target('Argentinian', 30, 'Lean grilled cuts (asado), chimichurri herb sauces, mate-rich diet.'),
  target('Peruvian', 35, 'Quinoa, fresh ceviche, anti-cuchos lean skewers, native superfoods.'),
  target('Mexican', 40, 'Bean + corn complete protein, lean carnitas, fresh salsas, pepitas.'),
];

// African — break West/East African into specific national cuisines.
const AFRICAN: CuisineTarget[] = [
  target('Nigerian', 45, 'Bean-based proteins (moi moi), leafy greens (ugu/spinach), tomato-rich stews, grilled lean suya.'),
  target('Ghanaian', 35, 'Black-eyed peas, fermented corn, grilled fish-based proteins.'),
  target('Senegalese', 30, 'Fish-based national dish (thieboudienne), peanut protein sauces.'),
  target('Cameroonian', 25, 'Leafy green-heavy stews (ndolé), nut-based sauces.'),
  target('Somali', 25, 'Lean meats, banana + rice combos, flatbread tradition.'),
  target('Eritrean', 25, 'Lentil/chickpea-based (shiro), fermented injera, spice-rich stews.'),
  target('Kenyan', 25, 'Bean + corn combos (githeri), grilled lean meats, collard greens (sukuma).'),
  target('Tanzanian', 20, 'Spiced rice, grilled protein skewers, plantain dishes.'),
  target('North African', 30, 'Egg-based protein (shakshuka), legume soups (harira), spice-rich.'),
  target('Ugandan', 20, 'Banana-based staples (matoke), steamed-in-banana-leaf, bean-forward.'),
  target('Congolese', 20, 'Palm nut sauces, cassava greens (saka-saka), banana leaf-steamed fish.'),
  target('Mozambican', 20, 'Peri-peri (capsaicin), cassava leaf stews, grilled seafood.'),
  target('Malagasy', 15, 'Leafy green stews (romazava), pork with cassava leaves, daily greens.'),
  target('Ivorian', 20, 'Cassava couscous (attiéké = low-cal starch), sealed-pot kédjenou (no added fat).'),
  target('Sudanese', 15, 'Fava bean breakfast (ful), sorghum flatbread, slow-cooked stews.'),
  target('Tunisian', 25, 'Chickpea-based (lablabi), egg-forward, harissa capsaicin, olive oil-rich.'),
  target('Algerian', 20, 'Semolina-based, vegetable-rich stews, lamb with dried fruits.'),
  target('South African', 25, 'Braai grilled meats, bobotie spiced minced beef, biltong lean protein.'),
  target('Ethiopian', 30, 'Teff (ancient grain), lentil-rich (misir wat), fermented injera, chickpeas (shiro).'),
];

// Middle Eastern, Persian & Gulf — 11 cuisines beyond the existing Lebanese/Turkish.
const MIDDLE_EASTERN: CuisineTarget[] = [
  target('Persian', 45, 'Herb-heavy stews (sabzi = herbs), saffron, yogurt-marinated proteins, pomegranate antioxidants.'),
  target('Afghan', 30, 'Rice + lamb, yogurt sauces, leek-filled dumplings, raisin/carrot garnishes.'),
  target('Iraqi', 25, 'Grilled fish tradition (masgouf), stuffed vegetables, legume-based.'),
  target('Kurdish', 20, 'Eggplant-heavy, tomato-based, grilled meats.'),
  target('Yemeni', 20, 'Slow-cooked lean proteins (mandi), fenugreek (superfood), spice-rich.'),
  target('Palestinian', 25, 'Sumac chicken (antioxidant), upside-down rice (maqluba), olive oil-forward.'),
  target('Syrian', 30, 'Bulgur-based (kibbeh), walnut-pepper spreads (muhammara), yogurt-sauced dumplings.'),
  target('Jordanian', 20, 'Fermented yogurt (jameed), slow-roasted meats (mansaf), pine nut garnishes.'),
  target('Saudi', 20, 'Spiced rice with lean proteins (kabsa), crushed wheat porridge (jareesh = whole grain).'),
  target('Emirati', 15, 'Slow-cooked wheat porridge (harees), spiced rice, date-based desserts.'),
  target('Omani', 15, 'Pit-roasted meats (shuwa = no added fat, 24-hour slow cook), grilled fish, date-based.'),
];

const CAUCASUS_CENTRAL_ASIA: CuisineTarget[] = [
  target('Armenian', 25, 'Grilled meats (khorovats), stuffed grape leaves, wheat porridge (harissa = whole grain).'),
  target('Azerbaijani', 20, 'Herb-stuffed flatbreads (qutab), slow-cooked lamb soup (piti), pomegranate-forward.'),
  target('Georgian', 25, 'Walnut-based sauces, fresh herb-heavy salads, lean grilled meats.'),
  target('Kazakh', 15, 'Fermented mare\'s milk tradition, dried dairy preservation, hand-pulled noodles with lean boiled meat.'),
  target('Uzbek', 20, 'Plov (lean lamb pilaf), shurpa lamb soup, herb-heavy salads, hand-pulled lagman noodles.'),
];

const EAST_SE_ASIA: CuisineTarget[] = [
  target('Burmese', 30, 'Fermented tea leaves (gut health), turmeric-rich, fish-based broths.'),
  target('Lao', 25, 'Fresh herbs, lean proteins (laab), lime-forward, sticky rice portions.'),
  target('Cambodian', 25, 'Coconut-steamed fish (amok), herb-heavy curry noodles, prahok fermented fish.'),
  target('Taiwanese', 30, 'Braised proteins, pickled vegetables, tea-based drinks.'),
  target('Okinawan', 20, 'BLUE ZONE CUISINE — tofu, bitter melon, sweet potato, seaweed, turmeric. One of the healthiest cuisines on earth.'),
  target('Mongolian', 20, 'Steamed dumplings (buuz), hand-pulled noodles, hearty meat-and-vegetable stews.'),
  target('Chinese', 45, 'Wok-stir-fries (low oil), steamed dumplings, tofu + vegetable mains, lean cuts in oyster sauce.'),
  target('Japanese', 35, 'Steamed/raw fish, seaweed (iodine), miso (probiotics), portion-controlled bento.'),
  target('Korean', 30, 'Fermented kimchi (probiotics), grilled bulgogi, vegetable banchan plates.'),
  target('Thai', 35, 'Fresh herbs (basil, lemongrass), nam pla based broths, vegetable-forward curries.'),
  target('Vietnamese', 35, 'Pho broth (gelatin/protein), fresh herbs, lean protein bowls, rice paper rolls.'),
  target('Malaysian', 25, 'Coconut-curry laksa, satay grilled lean proteins, vegetable nasi.'),
  target('Indonesian', 25, 'Nasi campur balanced plates, gado-gado (vegetable-forward), tempeh (fermented soy).'),
  target('Singaporean', 20, 'Hainanese chicken (poached lean), laksa, kaya toast (lighter version), hawker portions.'),
  target('Filipino', 25, 'Lean adobo, sinigang sour broth, kinilaw (raw seafood salad), ube (purple yam).'),
];

const SOUTH_ASIA: CuisineTarget[] = [
  target('Bangladeshi', 25, 'Fish-based protein (hilsa), mustard-rich preparations, lentil porridges.'),
  target('Nepali', 25, 'Daily lentil nutrition (dal bhat), steamed dumplings (momo), fermented greens (gundruk).'),
  target('Tibetan', 20, 'Barley-based nutrition (tsampa), steamed dumplings, high-altitude sustenance food.'),
  target('Bhutanese', 15, 'Chili-forward (capsaicin = metabolism), Bhutanese red rice (whole grain), cheese-based proteins.'),
  target('Indian', 50, 'Lentil-rich (dal), spiced legume curries, yogurt marinades (tandoori), vegetable-forward (sabzi).'),
  target('Pakistani', 30, 'Spiced lean meats (seekh kebab), lentil curries (daal), yogurt-marinated proteins.'),
  target('Sri Lankan', 25, 'Coconut-based curries, fish ambul thiyal, jackfruit polos, rice + sambol veg.'),
];

const AMERICAN_REGIONAL: CuisineTarget[] = [
  target('Soul Food', 40, 'Leafy greens, legumes, can be lightened — air-fried catfish, cauliflower mac.'),
  target('Southern', 35, 'Comfort food made healthier — air fryer, Greek yogurt swaps, whole grain grits.'),
  target('Cajun/Creole', 35, 'Bean-based (red beans & rice), seafood-heavy, roux lightened with less butter.'),
  target('Tex-Mex', 30, 'High-protein fajitas, bean-heavy, easily lightened with Greek yogurt.'),
  target('New England', 25, 'Seafood-forward, can lighten chowders with cauliflower base.'),
  target('Canadian', 25, 'Can lighten poutine with gravy reduction, meat pie tradition, Indigenous bannock bread.'),
  target('American', 35, 'Comfort food revamped — turkey burger, baked chicken tenders, lean meatloaf.'),
  target('Hawaiian', 25, 'Poke bowls, kalua pig, fresh fish, taro/poi (prebiotic fiber), pineapple.'),
  target('Californian', 25, 'Avocado-forward, farmers-market vegetables, lean grilled proteins, citrus.'),
];

const EUROPEAN: CuisineTarget[] = [
  target('Italian', 40, 'Olive oil-forward, fresh tomato sauces, lean fish, vegetable antipasti.'),
  target('French', 35, 'Light vinaigrettes, lean proteins (poulet rôti), vegetable-rich soups (pistou).'),
  target('Spanish', 30, 'Olive oil + tomato base, paella (lean seafood), tapas portion control.'),
  target('Greek', 30, 'Mediterranean diet baseline — olive oil, legumes, fish, yogurt, vegetables.'),
  target('Turkish', 30, 'Yogurt + grilled lean lamb, mezze plates, fresh salads, lentil soups.'),
  target('Lebanese', 30, 'Tabbouleh, fattoush, hummus + chickpea base, grilled kafta, olive oil-forward.'),
  target('German', 30, 'Sauerkraut (probiotics), lean pork tenderloin, root-vegetable stews.'),
  target('Polish', 30, 'Buckwheat (kasza), beet soup (barszcz), fermented vegetables, lean kielbasa.'),
  target('Hungarian', 25, 'Paprika-spiced lean stews, lecso (pepper-tomato), goulash with leaner cuts.'),
  target('Czech', 20, 'Lean roast pork, vegetable-rich svíčková sauces, sourdough rye breads.'),
  target('Portuguese', 30, 'Cod-based protein (bacalhau), kale soups (caldo verde), seafood stews.'),
  target('British', 25, 'Easily adapted lean — sweet potato topping, air-fried fish, turkey sausages.'),
  target('Irish', 25, 'Root vegetables, lean lamb, cabbage/kale-heavy, potato-based comfort.'),
  target('Swiss', 20, 'Oat-based breakfast (bircher muesli — invented here), dairy-rich proteins.'),
  target('Romanian', 25, 'Fermented cabbage rolls (sarmale = probiotics), cornmeal polenta (mămăligă), sour soups (gut health).'),
  target('Croatian', 20, 'Mediterranean-meets-Central European — seafood stews (brudet), under-the-bell slow cooking (peka).'),
  target('Bulgarian', 20, 'Cold yogurt soup (tarator = probiotics), fresh vegetable salads, roasted pepper spreads.'),
  target('Albanian', 15, 'Yogurt-baked lamb (tavë kosi), filo-based pies with greens, pepper-and-cheese bakes.'),
  target('Dutch', 20, 'Mashed root vegetable dishes (stamppot), split pea soup (erwtensoep = fiber bomb), raw herring (omega-3).'),
  target('Belgian', 20, 'Mussel-based protein (moules), beer-braised stews, chicken-and-cream stews (waterzooi).'),
  target('Austrian', 20, 'Boiled beef tradition (tafelspitz = lean), herb-forward sauces, can air-fry schnitzel.'),
  target('Finnish', 15, 'Rye-based pastries (whole grain), salmon soup (lohikeitto = omega-3), berry-heavy desserts.'),
  target('Maltese', 15, 'Broad bean dip (bigilla = plant protein), fish soup (aljotta), Mediterranean seafood.'),
  target('Cypriot', 15, 'Grilled halloumi protein, stuffed vine leaves, slow-cooked lamb, taro root (kolokasi).'),
  target('Scottish', 20, 'Smoked fish soups (cullen skink = omega-3), oat-based (cranachan, porridge tradition), barley broths.'),
  target('Icelandic', 15, 'Skyr (high-protein fermented dairy), dried fish (harðfiskur = pure protein), grass-fed lamb.'),
  target('Lithuanian', 15, 'Cold beet soup (šaltibarščiai = antioxidants + probiotics from kefir base), potato-based, rye bread tradition.'),
  target('Serbian', 20, 'Grilled meat tradition, roasted pepper spreads (ajvar), fermented cabbage rolls.'),
  target('Basque', 20, 'Seafood-heavy (marmitako = tuna stew), olive oil-forward, quality-over-quantity protein tradition.'),
  target('Swedish', 20, 'Cured salmon (gravlax = omega-3), rye crispbread, lingonberry antioxidants.'),
  target('Danish', 20, 'Open-faced sandwiches (smørrebrød = portion-controlled), rye bread (whole grain + fiber), pickled vegetables.'),
  target('Norwegian', 15, 'Lamb + cabbage stew (fårikål = lean), fermented fish tradition, cloudberry antioxidants.'),
];

const CARIBBEAN: CuisineTarget[] = [
  target('Jamaican', 25, 'Jerk grilled lean proteins, ackee + saltfish (lean fish), rice & peas (complete protein).'),
  target('Trinidadian', 25, 'Doubles (chickpea curry), roti + curried channa, pelau bean-rice combo.'),
  target('Barbadian', 25, 'Cou-cou & flying fish (lean fish + cornmeal), macaroni pie, fresh seafood-forward.'),
];

const PACIFIC: CuisineTarget[] = [
  target('New Zealand/Maori', 20, 'Earth-oven slow cooking (hangi = no added fat), seafood-forward, kumara (sweet potato).'),
  target('Fijian', 15, 'Raw fish in coconut (kokoda), taro leaves (rourou = iron + calcium), earth-oven technique.'),
  target('Polynesian', 15, 'Taro-based (poi = prebiotic fiber), raw fish salads, coconut-based, breadfruit.'),
];

// Common search staples — must exist on day one or the app feels broken.
const SEARCH_STAPLES: CuisineTarget[] = [
  target('American Comfort Classics', 40, 'High-protein lean versions — turkey burger, cauliflower pizza crust, baked "fried" chicken.'),
  target('Mexican-American Staples', 25, 'Lean protein swaps, lettuce wraps, high-fiber bean variations.'),
  target('Italian-American Staples', 25, 'Zucchini noodles, whole wheat pasta, Greek yogurt alfredo.'),
  target('Asian-American Staples', 20, 'Cauliflower fried rice, lean protein stir-fry, brown rice bowls.'),
  target('Fast Food Makeovers', 20, 'Same taste, 30-40% fewer calories — protein-forward versions of cravings.'),
  target('Breakfast Classics', 20, 'Macro-friendly takes on pancakes, waffles, French toast, eggs benedict, breakfast sandwiches.'),
];

export const GLOBAL_CUISINES_SEED: CuisineTarget[] = [
  ...LATIN_AMERICAN,
  ...AFRICAN,
  ...MIDDLE_EASTERN,
  ...CAUCASUS_CENTRAL_ASIA,
  ...EAST_SE_ASIA,
  ...SOUTH_ASIA,
  ...AMERICAN_REGIONAL,
  ...EUROPEAN,
  ...CARIBBEAN,
  ...PACIFIC,
  ...SEARCH_STAPLES,
];

export interface CuisineSeedSummary {
  totalCuisines: number;
  totalRecipes: number;
  byFamily: Record<string, { cuisineCount: number; recipeCount: number }>;
}

export const summarizeSeed = (): CuisineSeedSummary => {
  const byFamily: CuisineSeedSummary['byFamily'] = {};
  let totalRecipes = 0;
  for (const t of GLOBAL_CUISINES_SEED) {
    totalRecipes += t.recipeCount;
    const family = getCuisineFamily(t.name) ?? 'Unclassified';
    if (!byFamily[family]) byFamily[family] = { cuisineCount: 0, recipeCount: 0 };
    byFamily[family].cuisineCount += 1;
    byFamily[family].recipeCount += t.recipeCount;
  }
  return {
    totalCuisines: GLOBAL_CUISINES_SEED.length,
    totalRecipes,
    byFamily,
  };
};

// Convenience: per-cuisine prompt context built from healthAngle + tier addendum.
export const buildPromptContext = (target: CuisineTarget): string => {
  const tier = getHealthTierForCuisine(target.name);
  const tierLine = tier ? `Health tier: ${tier}` : '';
  return [target.healthAngle, tierLine].filter(Boolean).join(' ');
};
