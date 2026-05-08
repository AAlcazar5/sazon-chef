// backend/src/services/seasonalProduceService.ts
// ROADMAP 4.0 F6 — Seasonal awareness layer.
// ROADMAP 4.0 I2.3 — Locale-aware extension.
//
// Per-month produce-peak tables. en-US is the legacy default (Northern
// Hemisphere temperate zone). Locale-specific tables override per
// (locale, month) — Brazilian mango peaks Mar-Jul, Mexican chayote is
// year-round, etc. Unknown locales fall back to the en-US table so the
// existing Today card never breaks.

export interface SeasonalProduce {
  /** Lowercase ingredient name (matches RecipeIngredient.name normalization). */
  name: string;
  /** Lifestyle-voiced one-liner about why it's interesting now. */
  hook: string;
  /** Optional emoji for the Today card. */
  emoji?: string;
}

const EN_US_BY_MONTH: ReadonlyArray<readonly SeasonalProduce[]> = [
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

// ─── pt-BR (Brazilian) ─────────────────────────────────────────────────────
//
// Southern Hemisphere — seasons inverted from US. Tropical fruit calendar
// dominates. Mango is Mar-Jul (post-summer), pineapple year-round, banana
// year-round, açaí Sep-Dec, jabuticaba Sep-Oct, Brazilian summer Dec-Mar.

const PT_BR_BY_MONTH: ReadonlyArray<readonly SeasonalProduce[]> = [
  // 0 = Janeiro (verão)
  [
    { name: 'manga',       hook: "Manga rosa no auge — doce e perfumada, coma fresca ou em chutney.",        emoji: '🥭' },
    { name: 'tomate',      hook: "Tomate caqui no ponto — verão brasileiro é tomate de raiz.",                emoji: '🍅' },
    { name: 'abacaxi',     hook: "Abacaxi pérola no doce máximo — sirva com rapadura ou raspas de limão.",   emoji: '🍍' },
    { name: 'maracujá',    hook: "Maracujá-azedo no auge — sucos, mousses, ou sobre peixe grelhado.",          emoji: '🌿' },
  ],
  // 1 = Fevereiro
  [
    { name: 'manga',       hook: "Manga Tommy ou Palmer — fim de safra mas ainda doces, perfeitas para sucos.", emoji: '🥭' },
    { name: 'goiaba',      hook: "Goiaba vermelha no auge — coma com queijo branco ou faça compota.",            emoji: '🌿' },
    { name: 'milho verde', hook: "Milho verde fresquinho — pamonha, curau, ou na espiga com manteiga.",          emoji: '🌽' },
    { name: 'pitanga',     hook: "Pitanga no pé — agridoce, vermelho profundo, sucos e sorvetes.",                emoji: '🍒' },
  ],
  // 2 = Março
  [
    { name: 'manga',       hook: "Manga Palmer e Haden no auge — última leva de verão, aproveite.",              emoji: '🥭' },
    { name: 'caqui',       hook: "Caqui chocolate começando — doce, sedoso, coma com colher.",                    emoji: '🍊' },
    { name: 'figo',        hook: "Figo roxo brasileiro chegando — sirva com presunto curado e mel.",              emoji: '🌿' },
    { name: 'banana-da-terra', hook: "Banana-da-terra madura — frita, na moqueca, ou com queijo coalho.",          emoji: '🍌' },
  ],
  // 3 = Abril
  [
    { name: 'manga',       hook: "Manga Espada e rosa — última safra do ano, aproveite até maio.",               emoji: '🥭' },
    { name: 'abóbora',     hook: "Abóbora cabotiá no ponto — assada, em sopas ou no escondidinho.",              emoji: '🎃' },
    { name: 'mexerica',    hook: "Mexerica ponkan começando — doce, descascada na mão, lanche de criança.",     emoji: '🍊' },
    { name: 'mandioca',    hook: "Mandioca nova chegando — cozida com manteiga, frita, ou na moqueca.",          emoji: '🌿' },
  ],
  // 4 = Maio
  [
    { name: 'manga',       hook: "Manga Espada — fim de temporada, aproveite a última leva.",                    emoji: '🥭' },
    { name: 'inhame',      hook: "Inhame no ponto — cozido com sal grosso ou em sopa cremosa.",                   emoji: '🌿' },
    { name: 'tangerina',   hook: "Tangerina no auge — Murcot é a mais doce, descasque e coma já.",               emoji: '🍊' },
    { name: 'cará',        hook: "Cará começando a aparecer — doce, levemente úmido, frito ou cozido.",          emoji: '🌿' },
  ],
  // 5 = Junho (outono/inverno)
  [
    { name: 'tangerina',   hook: "Tangerina ponkan no auge — perfumada, fácil de descascar.",                     emoji: '🍊' },
    { name: 'caqui',       hook: "Caqui Fuyu firme — coma cru, ou caqui chocolate maduro com colher.",            emoji: '🍊' },
    { name: 'abacate',     hook: "Abacate Hass começando — vitamina, guacamole, ou puro com sal e limão.",         emoji: '🥑' },
    { name: 'pera',        hook: "Pera williams chegando — coma fresca, em compota, ou com queijo azul.",          emoji: '🍐' },
  ],
  // 6 = Julho
  [
    { name: 'laranja-pera',hook: "Laranja-pera no auge — suco, ou em rodelas no jantar.",                          emoji: '🍊' },
    { name: 'abacate',     hook: "Abacate Hass no auge — vitamina com leite, ou em torradas com sal grosso.",     emoji: '🥑' },
    { name: 'morango',     hook: "Morango brasileiro chegando — caipira, geleia, ou com chantilly.",               emoji: '🍓' },
    { name: 'beterraba',   hook: "Beterraba no doce máximo — assada, em saladas, ou no suco verde.",                emoji: '🌿' },
  ],
  // 7 = Agosto
  [
    { name: 'morango',     hook: "Morango do Sul de Minas no auge — coma fresco, geleia caseira, ou com creme.", emoji: '🍓' },
    { name: 'kiwi',        hook: "Kiwi nacional chegando — Petrolina, Vale do São Francisco, fresco e ácido.",    emoji: '🥝' },
    { name: 'beterraba',   hook: "Beterraba ainda doce — torta de chocolate com beterraba é surpresa boa.",       emoji: '🌿' },
    { name: 'couve',       hook: "Couve-manteiga no ponto — refogada com alho, na feijoada, ou em sucos verdes.", emoji: '🥬' },
  ],
  // 8 = Setembro
  [
    { name: 'morango',     hook: "Morango fim de safra — última leva, faça geleia para o ano.",                  emoji: '🍓' },
    { name: 'jabuticaba',  hook: "Jabuticaba começando — coma do pé, geleia, ou licor (semanas contadas).",      emoji: '🍇' },
    { name: 'açaí',        hook: "Açaí amazônico chegando — tigela com banana, granola, ou puro como tradição.", emoji: '🌿' },
    { name: 'manga',       hook: "Manga Tommy começando a aparecer — primeira leva, ainda firmes.",               emoji: '🥭' },
  ],
  // 9 = Outubro
  [
    { name: 'jabuticaba',  hook: "Jabuticaba no auge — janela curta de duas semanas, aproveite.",                emoji: '🍇' },
    { name: 'abacaxi',     hook: "Abacaxi pérola começando — fruta-bomba do verão chegando.",                     emoji: '🍍' },
    { name: 'manga',       hook: "Manga Tommy e Haden firmando — espere amadurecer no balcão.",                   emoji: '🥭' },
    { name: 'maracujá',    hook: "Maracujá começando a aparecer — ácido, perfumado, sucos e sobremesas.",         emoji: '🌿' },
  ],
  // 10 = Novembro
  [
    { name: 'manga',       hook: "Manga Tommy + Haden no doce — cubinhos no iogurte, salada, ou pura.",           emoji: '🥭' },
    { name: 'abacaxi',     hook: "Abacaxi pérola chegando ao auge — assado com canela ou em mousse.",             emoji: '🍍' },
    { name: 'lichia',      hook: "Lichia chegando — fruta tailandesa adaptada ao Brasil, doce e perfumada.",      emoji: '🌿' },
    { name: 'abóbora',     hook: "Abóbora menina chegando — doces, escondidinho, ou na moqueca.",                  emoji: '🎃' },
  ],
  // 11 = Dezembro
  [
    { name: 'manga',       hook: "Manga rosa começando o auge — verão brasileiro pede manga gelada.",             emoji: '🥭' },
    { name: 'tomate',      hook: "Tomate de raiz no auge — caprese brasileira, salada de verão.",                 emoji: '🍅' },
    { name: 'abacaxi',     hook: "Abacaxi pérola no doce máximo — Natal e Ano Novo pedem.",                       emoji: '🍍' },
    { name: 'pêssego',     hook: "Pêssego brasileiro chegando — sul do país, doce e perfumado.",                   emoji: '🍑' },
  ],
];

// ─── es-MX (Mexican) ───────────────────────────────────────────────────────
//
// Northern tropics — many ingredients are year-round (chayote, maíz, frijol,
// papaya, plátano). Avocado peaks Apr-Sep. Mango criollo Mar-Jul. Tunas
// (prickly pear) Aug-Oct. Calabaza year-round but peaks fall.

const ES_MX_BY_MONTH: ReadonlyArray<readonly SeasonalProduce[]> = [
  // 0 = Enero
  [
    { name: 'chayote',     hook: "Chayote tierno en su mejor momento — al vapor con sal o relleno.",            emoji: '🥬' },
    { name: 'naranja',     hook: "Naranja Valencia en pico — jugo recién hecho o en ensalada con jícama.",       emoji: '🍊' },
    { name: 'guayaba',     hook: "Guayaba criolla en aroma máximo — atole, agua fresca, o en gajos con chile.", emoji: '🌿' },
    { name: 'jícama',      hook: "Jícama crujiente y dulce — con limón y chile en polvo, clásico de calle.",     emoji: '🌿' },
  ],
  // 1 = Febrero
  [
    { name: 'chayote',     hook: "Chayote en pico — caldo de pollo, sopa de verduras, o gratinado.",             emoji: '🥬' },
    { name: 'fresa',       hook: "Fresa de Irapuato comenzando — en agua fresca, con crema, o con chile.",        emoji: '🍓' },
    { name: 'flor de calabaza', hook: "Flor de calabaza fresca — quesadillas, sopa, o en huitlacoche.",            emoji: '🌼' },
    { name: 'aguacate',    hook: "Aguacate Hass mejorando — guacamole, en torta, o con tortillas calientes.",      emoji: '🥑' },
  ],
  // 2 = Marzo
  [
    { name: 'mango',       hook: "Mango criollo comenzando — fresco, con limón y chile, o en agua fresca.",       emoji: '🥭' },
    { name: 'fresa',       hook: "Fresa en pico — paletas, mermelada, o con tequila y limón.",                    emoji: '🍓' },
    { name: 'aguacate',    hook: "Aguacate Hass en pico — temporada alta empieza ya.",                            emoji: '🥑' },
    { name: 'chayote',     hook: "Chayote sigue en su mejor momento — relleno con queso y rajas.",                emoji: '🥬' },
  ],
  // 3 = Abril
  [
    { name: 'mango',       hook: "Mango Ataulfo en pico — pequeño, dorado, dulce como caramelo.",                 emoji: '🥭' },
    { name: 'aguacate',    hook: "Aguacate Hass en pico — guacamole con chile serrano, mole de aguacate.",        emoji: '🥑' },
    { name: 'nopal',       hook: "Nopal tierno y abundante — asado con sal, en salsa verde, o con huevo.",        emoji: '🌵' },
    { name: 'piña',        hook: "Piña miel comenzando — al pastor, en agua, o asada con chile.",                  emoji: '🍍' },
  ],
  // 4 = Mayo
  [
    { name: 'mango',       hook: "Mango Manila / Ataulfo todavía en pico — última semana fuerte de Ataulfo.",     emoji: '🥭' },
    { name: 'piña',        hook: "Piña miel en pico — al horno con piloncillo y canela.",                         emoji: '🍍' },
    { name: 'sandía',      hook: "Sandía comenzando — agua fresca clásica, ensalada con queso panela y chile.",   emoji: '🍉' },
    { name: 'nopal',       hook: "Nopal en pico — limpia con cuidado, asa con sal y limón.",                       emoji: '🌵' },
  ],
  // 5 = Junio
  [
    { name: 'mango',       hook: "Mango Petacón / Tommy Atkins — el grande y carnoso, ideal para licuados.",      emoji: '🥭' },
    { name: 'sandía',      hook: "Sandía en pico — coma fría, con sal y chile, o en agua fresca.",                emoji: '🍉' },
    { name: 'aguacate',    hook: "Aguacate Hass aún en pico — chilaquiles, tortas, o solo con sal y limón.",       emoji: '🥑' },
    { name: 'chayote',     hook: "Chayote sigue presente — sopa de verduras, caldo Tlalpeño.",                    emoji: '🥬' },
  ],
  // 6 = Julio
  [
    { name: 'mango',       hook: "Mango Manila + Petacón — último mes fuerte, aproveche.",                       emoji: '🥭' },
    { name: 'tuna',        hook: "Tuna (fruto del nopal) comenzando — fría, dulce, con un toque de limón.",       emoji: '🌵' },
    { name: 'elote',       hook: "Elote tierno en pico — esquites con mayonesa, queso y chile.",                  emoji: '🌽' },
    { name: 'chayote',     hook: "Chayote disponible — relleno con picadillo, gratinado con queso.",              emoji: '🥬' },
  ],
  // 7 = Agosto
  [
    { name: 'tuna',        hook: "Tuna en pico — roja o verde, fría con limón y chile en polvo.",                 emoji: '🌵' },
    { name: 'elote',       hook: "Elote y maíz nuevo — esquites, pozole verde, atole de elote.",                  emoji: '🌽' },
    { name: 'huitlacoche', hook: "Huitlacoche fresco — el champiñón del maíz, en quesadillas o sopas.",            emoji: '🍄' },
    { name: 'chayote',     hook: "Chayote disponible todo el año — sopas, calabacitas, ensaladas.",                emoji: '🥬' },
  ],
  // 8 = Septiembre
  [
    { name: 'chiles en nogada',hook: "Chiles poblanos para chiles en nogada — granada, nuez, tradición.",          emoji: '🌶️' },
    { name: 'granada',     hook: "Granada criolla en pico — chiles en nogada, ensaladas, o granos sobre yogurt.", emoji: '🌿' },
    { name: 'huitlacoche', hook: "Huitlacoche aún disponible — quesadillas, crepas, o con elote.",                emoji: '🍄' },
    { name: 'calabaza',    hook: "Calabaza de Castilla apareciendo — sopas, dulces, en mole.",                    emoji: '🎃' },
    { name: 'chayote',     hook: "Chayote criollo siempre disponible — clásico de la cocina mexicana.",            emoji: '🥬' },
  ],
  // 9 = Octubre
  [
    { name: 'calabaza',    hook: "Calabaza de Castilla en pico — dulce de calabaza, sopa, atole.",                emoji: '🎃' },
    { name: 'tejocote',    hook: "Tejocote comenzando — para ponche navideño, conservar para diciembre.",         emoji: '🌿' },
    { name: 'guayaba',     hook: "Guayaba comenzando — fresca o para ponche y atoles.",                            emoji: '🌿' },
    { name: 'chayote',     hook: "Chayote disponible — sopas calientes para el cambio de clima.",                 emoji: '🥬' },
  ],
  // 10 = Noviembre
  [
    { name: 'tejocote',    hook: "Tejocote en pico — protagonista del ponche navideño.",                          emoji: '🌿' },
    { name: 'guayaba',     hook: "Guayaba en aroma máximo — ponche, atole de guayaba, o cruda con chile.",         emoji: '🌿' },
    { name: 'caña',        hook: "Caña de azúcar dulce — corte para ponche o para chupar fría.",                   emoji: '🌿' },
    { name: 'chayote',     hook: "Chayote disponible — perfecto para el caldo del Día de Muertos.",                emoji: '🥬' },
  ],
  // 11 = Diciembre
  [
    { name: 'tejocote',    hook: "Tejocote para ponche — temporada navideña, esencial.",                          emoji: '🌿' },
    { name: 'caña',        hook: "Caña de azúcar — ponche caliente con tejocote, guayaba y canela.",               emoji: '🌿' },
    { name: 'naranja',     hook: "Naranja Valencia comenzando — en ensaladas, jugo, o con romeritos.",             emoji: '🍊' },
    { name: 'chayote',     hook: "Chayote criollo todo el año — ahora va perfecto en romeritos.",                 emoji: '🥬' },
  ],
];

export const SEASONAL_PRODUCE_BY_LOCALE: Record<
  string,
  ReadonlyArray<readonly SeasonalProduce[]>
> = {
  'en-US': EN_US_BY_MONTH,
  en: EN_US_BY_MONTH,
  'pt-BR': PT_BR_BY_MONTH,
  pt: PT_BR_BY_MONTH,
  'es-MX': ES_MX_BY_MONTH,
  es: ES_MX_BY_MONTH,
};

// Back-compat: legacy callers / tests still import SEASONAL_PRODUCE_BY_MONTH.
export const SEASONAL_PRODUCE_BY_MONTH = EN_US_BY_MONTH;

/**
 * Resolve a locale tag to its produce table. Walks the BCP 47 chain:
 *   exact match → base language → en-US fallback.
 */
function resolveLocaleTable(
  locale: string | null | undefined,
): ReadonlyArray<readonly SeasonalProduce[]> {
  if (!locale) return EN_US_BY_MONTH;
  if (SEASONAL_PRODUCE_BY_LOCALE[locale]) return SEASONAL_PRODUCE_BY_LOCALE[locale];
  const base = locale.split('-')[0];
  if (SEASONAL_PRODUCE_BY_LOCALE[base]) return SEASONAL_PRODUCE_BY_LOCALE[base];
  return EN_US_BY_MONTH;
}

export interface SeasonalPickInput {
  /** Defaults to `new Date()`. */
  asOfDate?: Date;
  /** BCP 47 locale tag. Defaults to en-US. */
  locale?: string;
}

/**
 * Pick one peak ingredient for the day. Deterministic on (locale, year,
 * month, dayOfMonth). Different days inside one week always pick different
 * indexes (modulo length).
 */
export function pickSeasonalProduce(input: SeasonalPickInput = {}): SeasonalProduce | null {
  const date = input.asOfDate ?? new Date();
  const month = date.getMonth();
  const day = date.getDate();
  const list = resolveLocaleTable(input.locale)[month] ?? [];
  if (list.length === 0) return null;
  const idx = (day - 1) % list.length;
  return list[idx];
}

export interface FindPeakMonthInput {
  /** BCP 47 locale tag. Defaults to en-US. */
  locale?: string;
}

/**
 * Find the month index where a given ingredient is at peak in the given
 * locale's table. Returns -1 if not present. Falls back to en-US when the
 * locale is unknown.
 */
export function findPeakMonth(
  ingredientName: string,
  input: FindPeakMonthInput = {},
): number {
  const target = ingredientName.trim().toLowerCase();
  if (!target) return -1;
  const table = resolveLocaleTable(input.locale);
  for (let m = 0; m < table.length; m += 1) {
    if (table[m].some((p) => p.name === target)) {
      return m;
    }
  }
  return -1;
}

export const __forTest = { resolveLocaleTable };
