// P1 retention — cuisine neighbor dishes used by the new-cuisine unlock
// celebration ("First Persian cook — welcome to fesenjan and friends").
//
// Lightweight curated map; fully optional — when a cuisine isn't listed,
// callers should fall back to generic copy. Names are case-insensitive on
// lookup. Keep entries to 2–3 dishes max; the stamp's body line is short.

const NEIGHBORS: Record<string, readonly string[]> = {
  persian: ['fesenjan', 'tahdig', 'ghormeh sabzi'],
  mexican: ['mole', 'pozole', 'cochinita pibil'],
  italian: ['cacio e pepe', 'osso buco', 'risotto'],
  thai: ['tom kha', 'pad krapow', 'massaman'],
  indian: ['biryani', 'chana masala', 'palak paneer'],
  japanese: ['oyakodon', 'soba', 'okonomiyaki'],
  korean: ['bibimbap', 'doenjang jjigae', 'japchae'],
  vietnamese: ['pho', 'bun cha', 'banh xeo'],
  chinese: ['mapo tofu', 'kung pao', 'shumai'],
  french: ['ratatouille', 'coq au vin', 'cassoulet'],
  greek: ['gemista', 'fasolakia', 'spanakopita'],
  ethiopian: ['doro wat', 'misir wat', 'shiro'],
  moroccan: ['tagine', 'harira', 'msemen'],
  lebanese: ['fattoush', 'kibbeh', 'mujadara'],
  turkish: ['mantı', 'menemen', 'imam bayıldı'],
  brazilian: ['feijoada', 'moqueca', 'vatapá'],
  peruvian: ['aji de gallina', 'lomo saltado', 'ceviche'],
  colombian: ['ajiaco', 'bandeja paisa', 'arepas'],
  salvadorean: ['pupusas', 'sopa de pata', 'pollo encebollado'],
  filipino: ['adobo', 'sinigang', 'kare-kare'],
  caribbean: ['jerk chicken', 'oxtail stew', 'rice and peas'],
  spanish: ['paella', 'gazpacho', 'tortilla española'],
  nigerian: ['jollof rice', 'egusi soup', 'akara'],
  yucatecan: ['cochinita pibil', 'sopa de lima', 'panuchos'],
  okinawan: ['goya champuru', 'rafute', 'taco rice'],
  bahian: ['acarajé', 'moqueca baiana', 'vatapá'],
};

/** Returns up to 2 neighbor dishes for a cuisine, or [] if unknown. */
export function neighborsFor(cuisine: string): readonly string[] {
  const key = cuisine.trim().toLowerCase();
  return NEIGHBORS[key] ?? [];
}

/** Renders "and friends" copy when neighbors exist, else null. */
export function welcomeLine(cuisine: string): string | null {
  const ns = neighborsFor(cuisine);
  if (ns.length === 0) return null;
  if (ns.length === 1) return `Welcome to ${ns[0]} and friends.`;
  // Cap at the first 2 neighbors for a tight line.
  return `Welcome to ${ns[0]}, ${ns[1]}, and friends.`;
}
