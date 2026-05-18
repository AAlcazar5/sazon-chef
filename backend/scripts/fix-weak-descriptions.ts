// backend/scripts/fix-weak-descriptions.ts
//
// One-off remediation from the 2026-05-17 recipe-DB audit. Exact-title-key
// duplicates = 0 (clean). The audit's actionable findings were:
//   • 31 recipes with sub-40-char stub descriptions (worldtour-* one-liners
//     and seed-sibling-* technique fragments).
//   • 2 description-text collisions (Brazilian yogurt/curd sauces; a Tibetan
//     Thenthuk title variant) — same blurb on different rows.
// Each gets a vivid, accurate, brand-voice description (food-as-hero, no
// banned macro-cult vocabulary, ~90–150 chars). Idempotent: only writes when
// the current description differs from the target.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DESCRIPTIONS: Record<string, string> = {
  // ── seed-sibling technique variants — keep the technique angle, make it sing
  'seed-sibling-stovetop-mac-with-sharp-cheddar':
    'Silky stovetop mac with sharp cheddar — a glossy, pourable cheese sauce built right in the pan, no roux-heavy bake required.',
  'seed-sibling-skillet-lasagna-with-sheet-pan-ricotta':
    'All the layered comfort of lasagna in one skillet — tender noodles, herbed sheet-pan ricotta, and bubbling sauce, half the build time.',
  'seed-sibling-roasted-eggplant-parm':
    'Eggplant parm with deep roasted-slab flavor and the same molten mozzarella pull — oven-crisped instead of fried, lighter on its feet.',
  'seed-sibling-air-fried-pork-belly-kawali':
    'Shatteringly crisp pork belly kawali straight from the air fryer — the same blistered crackle and juicy interior, no bubbling oil bath.',
  'seed-sibling-oven-baked-lumpia':
    'Golden, crackly lumpia baked to a shatter-crisp wrapper around a savory pork-and-vegetable filling — handheld, dippable, no deep fryer.',
  'seed-sibling-baked-falafel-with-tahini':
    'Herb-flecked falafel with a craggy crust and green, fluffy center, oven-baked and drizzled with nutty lemon-tahini.',
  'seed-sibling-baked-kibbeh-tray':
    'A tray of spiced bulgur-and-beef kibbeh baked until the top crisps and the layers stay tender — Levantine comfort, sliced into diamonds.',
  'seed-sibling-sheet-pan-chicken-shawarma':
    'Warm-spiced chicken shawarma roasted on a single sheet pan until the edges char and crackle — all the spice, none of the spit-roaster.',

  // ── worldtour-* one-liners → vivid blurbs
  'worldtour-colombian-03':
    'Warm cornmeal arepas griddled until golden and stuffed with melting white cheese — crisp outside, molten within.',
  'worldtour-colombian-07':
    'Colombian pollo guisado: chicken slow-stewed with tomato, onion, and potato until fall-apart tender in a savory criollo sauce.',
  'worldtour-colombian-08':
    'Coconut rice simmered until the grains turn faintly caramelized and chewy, sweetened with plump raisins — Caribbean-Colombian comfort.',
  'worldtour-colombian-10':
    'Posta cartagenera: beef shoulder slow-braised in a sweet-savory panela-and-cola sauce until glossy and spoon-tender.',
  'worldtour-cuban-04':
    'Lechón asado: pork shoulder marinated in garlic and sour orange, then roasted until the crust crackles and the meat shreds.',
  'worldtour-cuban-06':
    'Cuban arroz con pollo — saffron-tinted rice and chicken simmered together with peppers, peas, and a splash of beer.',
  'worldtour-cuban-08':
    'Camarones enchilados: plump shrimp simmered in a bright, gently spicy tomato-and-pepper sauce, made for sopping up with rice.',
  'worldtour-cuban-09':
    'Bistec de palomilla: thin garlic-and-lime marinated steaks seared fast and piled with sweet sautéed onions.',
  'worldtour-salvadorean-02':
    'Sopa de gallina: a deeply savory Salvadoran hen soup with rice, chayote, and tender vegetables in golden broth.',
  'worldtour-salvadorean-04':
    'Pollo encebollado: chicken thighs smothered in slow-sweated onions and citrus until juicy and richly savory.',
  'worldtour-puerto_rican-01':
    'Arroz con gandules: Puerto Rico’s festive pigeon-pea rice built on a fragrant sofrito base with savory pork.',
  'worldtour-puerto_rican-02':
    'Pernil: garlic-and-oregano marinated pork shoulder roasted low and slow until the skin shatters and the meat pulls apart.',
  'worldtour-puerto_rican-04':
    'Pollo guisado boricua: chicken stewed in sofrito with potatoes and olives until thick, savory, and comforting.',
  'worldtour-puerto_rican-05':
    'Mofongo de pollo: garlicky mashed green plantain mounded around savory stewed chicken — crisp, dense, and deeply satisfying.',
  'worldtour-puerto_rican-06':
    'Habichuelas guisadas: pink beans simmered in sofrito with squash and potato into a thick, savory everyday stew.',
  'worldtour-puerto_rican-07':
    'Sancocho boricua: a hearty beef-and-root-vegetable stew with plantain and yautía, simmered into island comfort.',
  'worldtour-puerto_rican-09':
    'Asopao de pollo: a soupy, brothy chicken-and-rice gumbo-style stew, somewhere between paella and comfort soup.',
  'worldtour-puerto_rican-10':
    'Bistec encebollado: thin-sliced steak braised soft and smothered in sweet citrus-marinated onions.',
  'worldtour-nigerian-01':
    'Jollof rice: smoky, deeply spiced tomato-and-pepper rice cooked until the bottom catches into prized crispy party jollof.',
  'worldtour-nigerian-02':
    'Egusi soup: ground melon seeds simmered into a rich, nutty stew with leafy greens and savory meat.',
  'worldtour-nigerian-03':
    'Suya beef bowl: thinly grilled beef crusted in nutty, peppery yaji spice over a fresh, crunchy base.',
  'worldtour-nigerian-04':
    'Efo riro: a lush sautéed spinach stew built with peppers, beef, and smoked fish — savory, oily-rich, deeply Nigerian.',
  'worldtour-nigerian-06':
    'Akara: airy black-eyed pea fritters fried until crackly-crisp outside and pillowy within — a Nigerian street-morning staple.',

  // ── description-text collisions → unique, dish-accurate blurbs
  // Brazilian yogurt vs. curd sauce shared one English blurb verbatim.
  cmp9cwfk200q17z8d6t0ir8z2:
    'A cool, pourable Brazilian yogurt sauce whipped with fresh mint and bright lime — a tangy foil for grilled meats and churrasco.',
  cmp9te6rm00uvhrxtn655b0vp:
    'Molho de coalhada: thick, tangy strained-curd sauce loosened with mint and lime — denser and sharper than its yogurt cousin.',
  // Tibetan Thenthuk title variant that shared a blurb with its sibling.
  cmp61thzx07noq3w6eurkvdvo:
    'Thenthuk: hand-torn wheat noodle ribbons in a warming Tibetan broth with vegetables and tender meat — the original comfort bowl.',
};

async function main(): Promise<void> {
  const ids = Object.keys(DESCRIPTIONS);
  const rows = await prisma.recipe.findMany({
    where: { id: { in: ids } },
    select: { id: true, description: true },
  });
  const found = new Set(rows.map((r) => r.id));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) {
    console.log(`⚠️  ${missing.length} id(s) not found (skipping): ${missing.join(', ')}`);
  }

  let updated = 0;
  let unchanged = 0;
  for (const row of rows) {
    const next = DESCRIPTIONS[row.id];
    if ((row.description ?? '').trim() === next) {
      unchanged += 1;
      continue;
    }
    await prisma.recipe.update({
      where: { id: row.id },
      data: { description: next },
    });
    updated += 1;
  }
  console.log(
    `✅ descriptions: ${updated} updated, ${unchanged} already current, ${missing.length} missing of ${ids.length} targeted`,
  );
}

main()
  .catch((err) => {
    console.error('fix-weak-descriptions failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
