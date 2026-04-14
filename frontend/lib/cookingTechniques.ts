// Group 10I: Cooking techniques glossary.
// Curated list of ~50 common techniques. Pattern-matches instruction text and returns
// a 1-sentence explanation the user can expand as a "What's this?" tip.

export interface TechniqueTip {
  id: string;
  term: string;
  patterns: RegExp[];
  explanation: string;
}

const tip = (id: string, term: string, patterns: Array<string | RegExp>, explanation: string): TechniqueTip => ({
  id,
  term,
  patterns: patterns.map((p) => (p instanceof RegExp ? p : new RegExp(`\\b${p}\\b`, 'i'))),
  explanation,
});

export const COOKING_TECHNIQUES: ReadonlyArray<TechniqueTip> = [
  tip('braise', 'Braising', ['brais(e|ing|ed)'], 'Slow-cook in a small amount of liquid in a covered pot so the food turns tender.'),
  tip('sear', 'Searing', ['sear(ing|ed)?'], 'Cook the surface over high heat to build a brown, flavorful crust.'),
  tip('deglaze', 'Deglazing', ['deglaz(e|ing|ed)'], 'Add liquid to a hot pan to lift the browned bits stuck to the bottom — that’s pure flavor.'),
  tip('fold', 'Folding', ['fold (in|into)'], 'Gently combine a light mixture into a heavier one to keep it airy — use a spatula in slow turns.'),
  tip('blanch', 'Blanching', ['blanch(ing|ed)?'], 'Briefly boil, then plunge into ice water to stop cooking and lock in color.'),
  tip('reduce', 'Reducing', ['reduc(e|ing|ed) (by|to|until)'], 'Simmer a liquid until some evaporates and it thickens and concentrates.'),
  tip('temper', 'Tempering', ['temper(ing|ed)? '], 'Slowly warm a delicate ingredient (like eggs) with hot liquid so it doesn’t curdle.'),
  tip('bloom', 'Blooming spices', ['bloom(ing)? (the )?spice', 'toast(ing|ed)? (the )?spice'], 'Briefly cook whole or ground spices in oil to wake up their flavor before adding other ingredients.'),
  tip('roux', 'Making a roux', ['roux'], 'Cook equal parts flour and fat together — the base for creamy sauces and gravies.'),
  tip('julienne', 'Julienne', ['julienne'], 'Cut into long, thin matchstick strips — about 2 inches long and ⅛ inch thick.'),
  tip('chiffonade', 'Chiffonade', ['chiffonade'], 'Stack leaves, roll tightly, then slice into thin ribbons — usually for herbs or greens.'),
  tip('mince', 'Mincing', ['minc(e|ing|ed)'], 'Chop into very small, uniform pieces so the flavor distributes evenly.'),
  tip('dice', 'Dicing', ['dic(e|ing|ed)'], 'Cut into small, even cubes so ingredients cook at the same rate.'),
  tip('sauté', 'Sautéing', ['saut(é|e)(ing|ed)?'], 'Cook quickly in a small amount of fat over medium-high heat, tossing or stirring often.'),
  tip('simmer', 'Simmering', ['simmer(ing|ed)?'], 'Cook just below boiling — small bubbles, no rolling boil — for gentle, even cooking.'),
  tip('caramelize', 'Caramelizing', ['caramel(ize|izing|ized|ise|ising|ised)'], 'Cook low and slow so natural sugars turn deep brown and sweet.'),
  tip('poach', 'Poaching', ['poach(ing|ed)?'], 'Gently cook in barely simmering liquid — keeps delicate foods tender and moist.'),
  tip('steam', 'Steaming', ['steam(ing|ed)?'], 'Cook over (not in) boiling water so food stays tender and nutrients stay in.'),
  tip('marinate', 'Marinating', ['marinat(e|ing|ed)'], 'Soak in a seasoned liquid to add flavor and, for proteins, help tenderize.'),
  tip('rest', 'Resting meat', ['let (it|meat|steak|chicken) rest', 'rest(ing)? (the )?(meat|steak|chicken)'], 'Let cooked meat sit a few minutes so the juices redistribute — cut too early and they run out.'),
  tip('proof', 'Proofing dough', ['proof(ing)? (the )?dough', 'let (the )?dough rise'], 'Let dough rest so the yeast produces gas and the dough rises — gives bread its texture.'),
  tip('knead', 'Kneading', ['knead(ing|ed)?'], 'Work dough with your hands or a mixer to develop gluten — that’s what gives bread its chew.'),
  tip('whisk', 'Whisking', ['whisk(ing)?'], 'Beat rapidly to combine ingredients and incorporate air.'),
  tip('fry', 'Frying', ['deep[- ]?fry(ing|ed)?', 'pan[- ]?fry(ing|ed)?'], 'Cook in hot oil — deep-fry fully submerged, pan-fry in a shallow layer.'),
  tip('broil', 'Broiling', ['broil(ing|ed)?'], 'Cook directly under high overhead heat — fast browning, watch closely.'),
  tip('roast', 'Roasting', ['roast(ing|ed)?'], 'Cook uncovered in the oven with dry heat — browns the outside, keeps the inside juicy.'),
  tip('grill', 'Grilling', ['grill(ing|ed)?'], 'Cook over direct high heat on a grate — gives char marks and smoky flavor.'),
  tip('zest', 'Zesting', ['zest (the|a|an)?'], 'Grate the thin, colored outer layer of citrus peel — packed with aromatic oils.'),
  tip('cream', 'Creaming', ['cream (the|together)'], 'Beat fat and sugar together until light and fluffy — standard first step for cookies and cakes.'),
  tip('whip', 'Whipping', ['whip(ping|ped)?'], 'Beat vigorously to incorporate air until light and voluminous.'),
  tip('baste', 'Basting', ['bast(e|ing|ed)'], 'Spoon pan juices or butter over food as it cooks to keep it moist and build flavor.'),
  tip('render', 'Rendering fat', ['render(ing|ed)? (the )?fat'], 'Cook fatty meat slowly to melt the fat into liquid — perfect for crispy bacon or duck.'),
  tip('score', 'Scoring', ['scor(e|ing|ed) the'], 'Make shallow cuts in the surface so flavor penetrates and fat renders more easily.'),
  tip('brine', 'Brining', ['brin(e|ing|ed)'], 'Soak in salted water to season and help proteins hold moisture.'),
  tip('emulsify', 'Emulsifying', ['emulsif(y|ying|ied)'], 'Slowly whisk oil into a liquid (like vinegar or egg yolk) so it blends into a smooth sauce.'),
];

export interface DetectedTechnique extends TechniqueTip {
  /** The exact matched phrase in the source text (for highlighting, if needed). */
  match: string;
}

export function detectTechniques(
  instructionText: string,
  seenTechniqueIds: ReadonlySet<string> = new Set(),
): DetectedTechnique[] {
  if (!instructionText) return [];
  const found: DetectedTechnique[] = [];
  const alreadyFound = new Set<string>();

  for (const technique of COOKING_TECHNIQUES) {
    if (alreadyFound.has(technique.id)) continue;
    if (seenTechniqueIds.has(technique.id)) continue;
    for (const pattern of technique.patterns) {
      const match = instructionText.match(pattern);
      if (match) {
        found.push({ ...technique, match: match[0] });
        alreadyFound.add(technique.id);
        break;
      }
    }
  }

  return found;
}
