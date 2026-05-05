// frontend/lib/seasonalProduce.ts
// ROADMAP 4.0 F6 — Seasonal awareness layer (frontend mirror).
//
// Same data as backend/src/services/seasonalProduceService.ts. Lives on the
// frontend too so the Today card renders without an API round-trip — the
// content is calendar-deterministic so caching it locally is safe.

export interface SeasonalProduce {
  name: string;
  hook: string;
  emoji?: string;
}

const SEASONAL_PRODUCE_BY_MONTH: ReadonlyArray<readonly SeasonalProduce[]> = [
  // 0 = January
  [
    { name: 'citrus',     hook: "Cara cara oranges + meyer lemons are at their sweetest right now.", emoji: '🍊' },
    { name: 'kale',       hook: "Kale is sweeter after a frost — January is its sweet spot.",        emoji: '🥬' },
    { name: 'parsnips',   hook: "Parsnips taste like the love child of a carrot and a chestnut.",   emoji: '🥕' },
    { name: 'leeks',      hook: "Leeks are all sugar this month — try them braised whole.",          emoji: '🌿' },
  ],
  // 1 = February
  [
    { name: 'blood orange', hook: "Blood oranges are at peak — the deepest reds are the sweetest.", emoji: '🍊' },
    { name: 'fennel',       hook: "Fennel bulbs are still tight and licorice-bright in February.",   emoji: '🌿' },
    { name: 'cabbage',      hook: "Pointed cabbage gets crisp + slightly sweet in cold storage.",    emoji: '🥬' },
    { name: 'turnips',      hook: "Hakurei turnips eat like a savory apple — try them raw.",          emoji: '🥕' },
  ],
  // 2 = March
  [
    { name: 'asparagus',  hook: "Asparagus is at peak this week — try it grilled with lemon.",        emoji: '🌱' },
    { name: 'rhubarb',     hook: "Rhubarb is the first sweet-tart fruit of the year — pair with strawberry.", emoji: '🌸' },
    { name: 'peas',        hook: "English peas are sweet + grassy — eat them within 24 hours.",        emoji: '🌿' },
    { name: 'green garlic',hook: "Green garlic is mild — use the whole stalk like a leek.",           emoji: '🌱' },
  ],
  // 3 = April
  [
    { name: 'asparagus', hook: "Asparagus is still at peak — pencil-thin spears are the prize.",       emoji: '🌱' },
    { name: 'morels',    hook: "Morels are appearing — sauté in butter, deglaze with sherry.",         emoji: '🍄' },
    { name: 'radish',    hook: "French breakfast radishes are crisp + spicy — eat with butter + salt.",emoji: '🌿' },
    { name: 'fava beans',hook: "Fava beans are at their best — double-shell them and dress with mint.",emoji: '🌱' },
    { name: 'ramps',     hook: "Ramps are a 3-week season — wild garlic / onion notes, treat them well.", emoji: '🌿' },
  ],
  // 4 = May
  [
    { name: 'strawberries',hook: "Local strawberries are starting — the small ones taste the strongest.", emoji: '🍓' },
    { name: 'asparagus',  hook: "Asparagus's last weeks — the season ends in late May.",                 emoji: '🌱' },
    { name: 'snap peas',  hook: "Snap peas are sweet and crunchy — try them raw in salads.",             emoji: '🌿' },
    { name: 'spring onion',hook: "Spring onions are mild — grill them whole and dress in vinaigrette.",  emoji: '🌿' },
  ],
  // 5 = June
  [
    { name: 'strawberries', hook: "Strawberries are at peak — the season is short, lean in.",            emoji: '🍓' },
    { name: 'cherries',     hook: "Cherries are starting — the dark ones are sweetest.",                  emoji: '🍒' },
    { name: 'apricots',     hook: "Apricots are showing up — eat them ripe at room temp.",                emoji: '🍑' },
    { name: 'zucchini',     hook: "Zucchini is just hitting — blossoms are edible too.",                  emoji: '🥒' },
    { name: 'blueberries',  hook: "Blueberries are starting — wild are smaller + tarter than cultivated.", emoji: '🫐' },
  ],
  // 6 = July
  [
    { name: 'tomatoes',  hook: "Tomatoes are FINALLY at peak — eat them raw, never refrigerate.",     emoji: '🍅' },
    { name: 'corn',      hook: "Corn is sweetest within hours of picking — find a farm stand.",        emoji: '🌽' },
    { name: 'peaches',   hook: "Peaches are at peak — the ones that smell like peach are the right ones.", emoji: '🍑' },
    { name: 'basil',     hook: "Basil is bushy and pungent — make pesto + freeze for January.",        emoji: '🌿' },
    { name: 'blueberries',hook: "Blueberries are still going — fold into yogurt with honey.",          emoji: '🫐' },
  ],
  // 7 = August
  [
    { name: 'tomatoes', hook: "Tomato peak continues — heirlooms are at their most surreal.",          emoji: '🍅' },
    { name: 'eggplant', hook: "Eggplant is glossy and meaty — char it whole on a flame.",               emoji: '🍆' },
    { name: 'corn',     hook: "Corn season is winding down — get it while you can.",                     emoji: '🌽' },
    { name: 'peppers',  hook: "Sweet peppers are at peak — try them roasted with anchovy + garlic.",     emoji: '🫑' },
    { name: 'figs',     hook: "Figs are starting — eat at room temperature, never refrigerate.",         emoji: '🌿' },
  ],
  // 8 = September
  [
    { name: 'apples',    hook: "Apples are starting their season — heritage varieties are wild.",         emoji: '🍎' },
    { name: 'figs',      hook: "Figs are at peak — try them with goat cheese + honey + thyme.",           emoji: '🌿' },
    { name: 'grapes',    hook: "Concord grapes are at peak — make jam, drink the juice.",                 emoji: '🍇' },
    { name: 'pears',     hook: "Pears are starting — let them ripen on the counter, never the fridge.",    emoji: '🍐' },
    { name: 'pumpkin',   hook: "Pumpkins are arriving — sugar pumpkins are for eating, jack-o's are for porches.", emoji: '🎃' },
  ],
  // 9 = October
  [
    { name: 'apples',         hook: "Apple peak — try a Pink Lady, a Mutsu, a Honeycrisp side-by-side.",  emoji: '🍎' },
    { name: 'butternut squash',hook: "Butternut squash is at its sweetest — roast whole, no peeling needed.", emoji: '🎃' },
    { name: 'pomegranates',   hook: "Pomegranates are starting — the seeds make any salad weeknight-special.", emoji: '🍇' },
    { name: 'cranberries',    hook: "Fresh cranberries are showing up — make a chutney, freeze the rest.",  emoji: '🌿' },
    { name: 'mushrooms',      hook: "Wild mushroom season — chanterelles, hen-of-the-woods, lobster.",        emoji: '🍄' },
  ],
  // 10 = November
  [
    { name: 'butternut squash',hook: "Squash is sweet enough to eat as dessert — try it roasted with miso.", emoji: '🎃' },
    { name: 'sweet potatoes',  hook: "Sweet potatoes have been curing in storage — they're sweetest now.",   emoji: '🍠' },
    { name: 'pomegranates',    hook: "Pomegranates are at peak — break one open over a salad.",              emoji: '🍇' },
    { name: 'celery root',     hook: "Celery root looks alien but tastes like the love child of celery + parsnip.", emoji: '🌿' },
    { name: 'persimmon',       hook: "Persimmons are arriving — Hachiya needs to be JELLY-soft, Fuyu eats hard.", emoji: '🍊' },
  ],
  // 11 = December
  [
    { name: 'citrus',     hook: "Citrus season is just starting — try a mandarin you've never had.",     emoji: '🍊' },
    { name: 'pomegranates',hook: "Pomegranates are still going strong — last call into January.",         emoji: '🍇' },
    { name: 'persimmon',  hook: "Persimmons are at peak — fuyu in salads, hachiya in cake.",              emoji: '🍊' },
    { name: 'chestnuts',  hook: "Roasted chestnuts are a 6-week window — get them from a street cart.",    emoji: '🌰' },
  ],
];

export function pickSeasonalProduce(asOfDate: Date = new Date()): SeasonalProduce | null {
  const month = asOfDate.getMonth();
  const day = asOfDate.getDate();
  const list = SEASONAL_PRODUCE_BY_MONTH[month] ?? [];
  if (list.length === 0) return null;
  const idx = (day - 1) % list.length;
  return list[idx];
}

export { SEASONAL_PRODUCE_BY_MONTH };
