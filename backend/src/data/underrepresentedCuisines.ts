// backend/src/data/underrepresentedCuisines.ts
// ROADMAP 4.0 Tier D9 — Underrepresented-cuisine acquisition list.
//
// The deliberate-investment list. These cuisines are *intentionally*
// surfaced over generic recipe apps — they're Sazon's moat for the
// "past the spreadsheet" lifestyle eater. Coverage report (D5) treats
// missing slots in these cuisines as priority gaps.

import type { Archetype } from './cuisineArchetypeMatrix';

export interface ArchetypeTarget {
  required: boolean;
  canonicalDishes: readonly string[];
}

export interface UnderrepresentedEntry {
  canonical: string;
  subCuisine: string | null;
  displayName: string;
  rationale: string;
  archetypeTargets: Readonly<Partial<Record<Archetype, ArchetypeTarget>>>;
  advisors: readonly string[];
}

const T = (
  required: boolean,
  ...dishes: string[]
): ArchetypeTarget => ({ required, canonicalDishes: dishes });

export const UNDERREPRESENTED: readonly UnderrepresentedEntry[] = [
  {
    canonical: 'filipino',
    subCuisine: null,
    displayName: 'Filipino',
    rationale:
      "Sazon's largest-market underrepresented cuisine. Adobo, sinigang, kare-kare span every archetype.",
    archetypeTargets: {
      weeknight_main: T(true, 'chicken adobo', 'tortang talong', 'tinolang manok'),
      weekend_project: T(true, 'kare-kare', 'lechon kawali', 'crispy pata'),
      comfort_stew: T(true, 'sinigang na baboy', 'nilagang baka', 'pochero'),
      rice_or_grain: T(true, 'arroz caldo', 'sinangag', 'bibingka'),
      vegetable_forward: T(false, 'pinakbet', 'ginataang gulay', 'lumpiang sariwa'),
      breakfast: T(true, 'tapsilog', 'longsilog', 'champorado'),
      sweet_or_dessert: T(false, 'leche flan', 'halo-halo', 'biko'),
      quick_lunch: T(false, 'pancit canton', 'lugaw', 'ginisang munggo'),
    },
    advisors: ['Maharlika cookbook', 'I Am a Filipino', 'Doreen Fernandez'],
  },
  {
    canonical: 'ethiopian',
    subCuisine: null,
    displayName: 'Ethiopian',
    rationale:
      'Plant-forward, complete-protein-rich, deeply spiced. Every archetype mainstream eaters miss.',
    archetypeTargets: {
      weeknight_main: T(true, 'doro wat', 'misir wat', 'gomen besiga'),
      weekend_project: T(false, 'tibs (slow)', 'shiro tegabino', 'kitfo'),
      comfort_stew: T(true, 'doro wat', 'siga wat', 'kik alicha'),
      rice_or_grain: T(false, 'injera (teff)', 'genfo'),
      vegetable_forward: T(true, 'beyaynetu', 'gomen', 'atakilt wat'),
      breakfast: T(false, 'firfir', 'fatira', 'genfo'),
    },
    advisors: ['Ethiopia: Recipes and Traditions', 'Yohanis Gebreyesus'],
  },
  {
    canonical: 'eritrean',
    subCuisine: null,
    displayName: 'Eritrean',
    rationale:
      'Distinct from Ethiopian — coastal influences, lighter spice. Should never be rolled into "East African."',
    archetypeTargets: {
      weeknight_main: T(true, 'zigni', 'dorho tsebhi', 'silsi'),
      comfort_stew: T(true, 'zigni', 'tsebhi alicha', 'shiro'),
      vegetable_forward: T(true, 'hamli', 'alicha birsen', 'qicha fitfit'),
      rice_or_grain: T(false, 'injera', 'kitcha'),
      breakfast: T(false, 'ful medames', 'fatira'),
    },
    advisors: ['Asmara: An Eritrean Cookbook'],
  },
  {
    canonical: 'georgian',
    subCuisine: null,
    displayName: 'Georgian',
    rationale:
      'Walnut-heavy, cheese-bread tradition (khachapuri), unique flavor profile no other cuisine in the catalog covers.',
    archetypeTargets: {
      weeknight_main: T(true, 'shkmeruli', 'mtsvadi', 'chakhokhbili'),
      weekend_project: T(true, 'khinkali', 'satsivi', 'chakapuli'),
      vegetable_forward: T(true, 'pkhali', 'badrijani nigvzit', 'lobio'),
      rice_or_grain: T(false, 'shoti puri', 'ghomi'),
      breakfast: T(true, 'khachapuri (acharuli)', 'kubdari', 'chvishtari'),
    },
    advisors: ['Tasting Georgia', 'Carla Capalbo'],
  },
  {
    canonical: 'levantine',
    subCuisine: 'lebanese',
    displayName: 'Lebanese',
    rationale:
      'Most accessible Levantine sub but deserves its own coverage — kibbeh, tabbouleh, shawarma, manakeesh.',
    archetypeTargets: {
      weeknight_main: T(true, 'kibbeh nayyeh', 'shish taouk', 'kafta'),
      weekend_project: T(true, 'kibbeh bil sanieh', 'mahshi', 'sayadieh'),
      vegetable_forward: T(true, 'tabbouleh', 'fattoush', 'sheikh el mahshi'),
      breakfast: T(true, 'manakish zaatar', 'foul medames', 'shakshuka'),
      quick_lunch: T(true, 'mezze plate', 'falafel sandwich', 'shawarma'),
      sweet_or_dessert: T(false, 'maamoul', 'knafeh'),
    },
    advisors: ['Anissa Helou', 'Reem Kassis'],
  },
  {
    canonical: 'levantine',
    subCuisine: 'palestinian',
    displayName: 'Palestinian',
    rationale: 'Distinct from Lebanese — musakhan, maqluba, dukkah profiles.',
    archetypeTargets: {
      weeknight_main: T(true, 'musakhan', 'maqluba', 'magluba kousa'),
      weekend_project: T(true, 'mansaf', 'maglouba (whole)', 'shish barak'),
      comfort_stew: T(true, 'mloukhieh', 'fasolia', 'bamia'),
      vegetable_forward: T(true, 'tabbouleh', 'mujadara', 'koshary'),
    },
    advisors: ['Reem Kassis', 'The Palestinian Table'],
  },
  {
    canonical: 'senegalese',
    subCuisine: null,
    displayName: 'Senegalese',
    rationale:
      'Thieboudienne is one of the great rice dishes of the world. Maafe is the platonic peanut stew.',
    archetypeTargets: {
      weeknight_main: T(true, 'yassa poulet', 'mafe', 'thiou'),
      weekend_project: T(true, 'thieboudienne', 'thiebou yapp', 'mbakhal salate'),
      comfort_stew: T(true, 'mafe', 'soupou kanja', 'caldou'),
      rice_or_grain: T(true, 'thieboudienne', 'thiebou yapp', 'cere basi'),
      vegetable_forward: T(false, 'thiou', 'salade niçoise senegalese'),
    },
    advisors: ['Pierre Thiam', 'Senegal: Modern Senegalese Recipes'],
  },
  {
    canonical: 'peruvian',
    subCuisine: null,
    displayName: 'Peruvian',
    rationale:
      'Fusion lab of the Americas — Chifa, Nikkei, Andean. Ceviche + lomo saltado + ají de gallina anchor breadth.',
    archetypeTargets: {
      weeknight_main: T(true, 'lomo saltado', 'aji de gallina', 'tacu tacu'),
      weekend_project: T(true, 'arroz con pato', 'pachamanca', 'seco de cordero'),
      comfort_stew: T(true, 'aji de gallina', 'seco de res', 'carapulcra'),
      rice_or_grain: T(true, 'arroz chaufa', 'arroz con pollo', 'tacu tacu'),
      vegetable_forward: T(true, 'causa rellena', 'papa a la huancaina', 'solterito'),
      quick_lunch: T(true, 'ceviche', 'tiradito', 'sanguche de chicharron'),
    },
    advisors: ['Gastón Acurio', 'The Latin American Cookbook'],
  },
  {
    canonical: 'trinidadian',
    subCuisine: null,
    displayName: 'Trinidadian',
    rationale:
      'Indo-Caribbean fusion — doubles, roti, callaloo. Distinct from Jamaican.',
    archetypeTargets: {
      weeknight_main: T(true, 'curry chicken', 'stew chicken', 'pelau'),
      weekend_project: T(true, 'roti with curry goat', 'pelau (full)', 'pastelle'),
      comfort_stew: T(true, 'callaloo', 'cow heel soup', 'corn soup'),
      rice_or_grain: T(true, 'pelau', 'cookup rice', 'macaroni pie'),
      breakfast: T(true, 'doubles', 'sada roti with choka', 'aloo pie'),
      quick_lunch: T(true, 'doubles', 'aloo pie', 'shark and bake'),
    },
    advisors: ['Ramin Ganeshram', 'Caribbean Vegan'],
  },
  {
    canonical: 'lao',
    subCuisine: null,
    displayName: 'Lao',
    rationale:
      'Often confused with Thai — sticky rice culture, larb, jeow distinguish it. Khao soi is the lunch hero.',
    archetypeTargets: {
      weeknight_main: T(true, 'larb', 'or lam', 'tam mak hoong'),
      weekend_project: T(false, 'mok pa (banana leaf fish)', 'naem khao', 'sai oua'),
      comfort_stew: T(true, 'or lam', 'tom kha kai', 'kaeng nor mai'),
      rice_or_grain: T(true, 'khao niaw (sticky rice)', 'khao poon', 'khao piak sen'),
      vegetable_forward: T(true, 'tam mak hoong', 'jeow makheua', 'sien savanh'),
      quick_lunch: T(true, 'khao soi', 'fer (lao pho)', 'khao jee sandwich'),
    },
    advisors: ['Seng Luangrath', 'Phia Sing'],
  },
  {
    canonical: 'burmese',
    subCuisine: null,
    displayName: 'Burmese',
    rationale:
      'Mohinga is one of the great breakfast soups of the world. Fermented tea-leaf salad has no equivalent in any other cuisine.',
    archetypeTargets: {
      weeknight_main: T(true, 'ohn no khao swè', 'kyay-oh', 'sebon kyaw'),
      weekend_project: T(true, 'mohinga (full)', 'shan noodles', 'lahpet thoke prep'),
      comfort_stew: T(true, 'pork curry with mango', 'chickpea tofu curry', 'kyet hin'),
      rice_or_grain: T(true, 'kauk-nyin baung', 'htamin gyaw', 'shan rice'),
      vegetable_forward: T(true, 'lahpet thoke (tea-leaf salad)', 'gourd curry', 'water-spinach'),
      breakfast: T(true, 'mohinga', 'nan gyi thohk', 'ekya kyaw'),
    },
    advisors: ['Burma: Rivers of Flavor', 'Naomi Duguid'],
  },
  {
    canonical: 'mexican',
    subCuisine: 'oaxacan',
    displayName: 'Oaxacan',
    rationale:
      'Land of seven moles. Tlayudas + chapulines + mezcal complete the picture beyond Tex-Mex generic.',
    archetypeTargets: {
      weeknight_main: T(true, 'tlayuda', 'molotes', 'tasajo asado'),
      weekend_project: T(true, 'mole negro', 'mole coloradito', 'mole amarillo'),
      comfort_stew: T(true, 'caldo de res oaxaqueño', 'amarillo de pollo', 'mole verde'),
      vegetable_forward: T(true, 'memelas', 'chiles rellenos de queso', 'molotes con verduras'),
      breakfast: T(false, 'memelas', 'tamales oaxaqueños', 'champurrado'),
    },
    advisors: ['Diana Kennedy', 'Oaxaca: Home Cooking'],
  },
  {
    canonical: 'mexican',
    subCuisine: 'yucatecan',
    displayName: 'Yucatecan',
    rationale:
      'Mayan + Lebanese fusion. Cochinita pibil is the platonic slow-roast pork.',
    archetypeTargets: {
      weeknight_main: T(true, 'pollo pibil', 'panuchos', 'salbutes'),
      weekend_project: T(true, 'cochinita pibil', 'queso relleno', 'mucbil pollo'),
      comfort_stew: T(true, 'frijol con puerco', 'sopa de lima', 'caldo tlalpeño yucateco'),
      vegetable_forward: T(false, 'tikin xic', 'salpicón yucateco', 'chaya con huevo'),
      breakfast: T(false, 'huevos motuleños', 'papadzules', 'longaniza yucateca'),
    },
    advisors: ['David Sterling', 'Yucatán: Recipes from a Culinary Expedition'],
  },
  {
    canonical: 'mexican',
    subCuisine: 'michoacan',
    displayName: 'Michoacán',
    rationale:
      'Carnitas Quiroga-style + corundas + uchepos differ sharply from Mexico City and Norteño.',
    archetypeTargets: {
      weeknight_main: T(true, 'enchiladas placeras', 'tostadas michoacanas', 'aporreadillo'),
      weekend_project: T(true, 'carnitas Quiroga-style', 'churipo', 'morisqueta'),
      comfort_stew: T(true, 'sopa tarasca', 'caldo michi', 'churipo'),
      rice_or_grain: T(true, 'corundas', 'uchepos', 'morisqueta'),
      breakfast: T(false, 'uchepos con crema', 'gazpacho moreliano', 'pan de queso'),
    },
    advisors: ['Diana Kennedy', 'My Mexico'],
  },
  {
    canonical: 'italian',
    subCuisine: 'sicilian',
    displayName: 'Sicilian',
    rationale:
      'Arab + Greek + Norman heritage. Caponata, pasta alla Norma, sarde a beccafico — none feel like generic "Italian."',
    archetypeTargets: {
      weeknight_main: T(true, 'pasta alla norma', 'pasta con le sarde', 'involtini di pesce spada'),
      weekend_project: T(true, 'sarde a beccafico', 'arancini', 'caponata'),
      vegetable_forward: T(true, 'caponata', 'parmigiana di melanzane', 'cucuzza'),
      rice_or_grain: T(true, 'arancini', 'risotto al nero di seppia', 'pasta alla Norma'),
      sweet_or_dessert: T(false, 'cassata', 'cannoli', 'granita di mandorla'),
    },
    advisors: ['Mary Taylor Simeti', 'Pomp and Sustenance'],
  },
  {
    canonical: 'italian',
    subCuisine: 'sardinian',
    displayName: 'Sardinian',
    rationale:
      'Inland mountain food (porceddu, pane carasau) + coastal seafood (fregola, bottarga). Distinct from peninsular Italian.',
    archetypeTargets: {
      weeknight_main: T(true, 'malloreddus alla campidanese', 'fregola con vongole', 'culurgiones'),
      weekend_project: T(true, 'porceddu', 'agnello con carciofi', 'culurgiones (full)'),
      comfort_stew: T(true, 'cassola', 'agnello con piselli', 'zuppa gallurese'),
      rice_or_grain: T(true, 'fregola', 'pane carasau', 'malloreddus'),
      vegetable_forward: T(false, 'cucuzzedda imbottita', 'fave con pecorino'),
    },
    advisors: ['Efisio Farris', 'Sardinia: A Culinary Journey'],
  },
  {
    canonical: 'spanish',
    subCuisine: 'andalusian',
    displayName: 'Andalusian',
    rationale: 'Moorish heritage. Salmorejo + ajoblanco + flamenquín underrepresented in generic Spanish coverage.',
    archetypeTargets: {
      weeknight_main: T(true, 'pescaíto frito', 'flamenquín', 'rabo de toro'),
      weekend_project: T(true, 'rabo de toro (full)', 'paella mixta andaluza', 'menudo gitano'),
      comfort_stew: T(true, 'rabo de toro', 'menudo gitano', 'puchero andaluz'),
      vegetable_forward: T(true, 'salmorejo', 'pipirrana', 'espinacas con garbanzos'),
      quick_lunch: T(true, 'salmorejo', 'ajoblanco', 'tostada con tomate'),
    },
    advisors: ['Claudia Roden', 'Sam and Sam Clark'],
  },
  {
    canonical: 'hungarian',
    subCuisine: null,
    displayName: 'Hungarian',
    rationale:
      "Paprika + lard + sour cream cuisine. Goulash is the only Hungarian dish most users know — there's a whole world behind it.",
    archetypeTargets: {
      weeknight_main: T(true, 'paprikás csirke', 'töltött káposzta', 'pörkölt'),
      weekend_project: T(true, 'töltött káposzta (full)', 'rakott krumpli', 'rántott hús (Wiener-style)'),
      comfort_stew: T(true, 'gulyás', 'pörkölt', 'halászlé'),
      vegetable_forward: T(false, 'lecsó', 'tök főzelék', 'rakott padlizsán'),
      sweet_or_dessert: T(false, 'somlói galuska', 'dobos torta', 'palacsinta'),
    },
    advisors: ['George Lang', 'The Cuisine of Hungary'],
  },
];

export function isUnderrepresented(
  canonical: string,
  subCuisine: string | null = null,
): boolean {
  return UNDERREPRESENTED.some(
    (e) => e.canonical === canonical && e.subCuisine === subCuisine,
  );
}

export function findUnderrepresented(
  canonical: string,
  subCuisine: string | null = null,
): UnderrepresentedEntry | null {
  return (
    UNDERREPRESENTED.find(
      (e) => e.canonical === canonical && e.subCuisine === subCuisine,
    ) ?? null
  );
}

export function listUnderrepresentedKeys(): Array<{ canonical: string; subCuisine: string | null }> {
  return UNDERREPRESENTED.map((e) => ({
    canonical: e.canonical,
    subCuisine: e.subCuisine,
  }));
}
