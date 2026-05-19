// Tier Y-1 — step-prose quantity rebinding (the linchpin of the Cooking
// Mode replica). Golden fixtures are the founder's own screenshots: the
// roasted-potato recipe at servings 4 (stored base) rescaled to 2 and 3.
// RED-first: the module does not exist yet.
//
// The defining safety invariant: only substrings that match a known
// ingredient's amount+unit rescale. Oven temps, times, and sizes
// ("400°F", "30 minutes", "1-inch", "15-20 minutes") are structurally
// untouchable because no ingredient carries those units.

import {
  rescaleStepText,
  scaleQuantityDisplay,
} from '../../../lib/cooking/rescaleStepText';

// Stored base = servings 4 (recipes default to 4; matches screenshot #10).
const BASE = [
  { name: 'potatoes or sweet potatoes', amount: 2, unit: 'pounds' },
  { name: 'olive oil', amount: 2, unit: 'tablespoons' },
  { name: 'garlic powder', amount: 0.5, unit: 'teaspoons' },
  { name: 'smoked paprika', amount: 0.5, unit: 'teaspoons' },
  { name: 'rosemary or thyme', amount: 0.5, unit: 'teaspoons' },
  { name: 'black pepper', amount: 0.5, unit: 'teaspoons' },
  { name: 'salt', amount: 0.8, unit: 'teaspoons' },
] as const;

const STEP1 =
  'Prep potatoes: Preheat toaster oven to 400°F. Wash and scrub 2 pounds ' +
  'potatoes or sweet potatoes — peel if preferred or leave skin on for ' +
  'extra fiber. Cut into uniform 1-inch cubes — uniformity is critical ' +
  'for even cooking.';

const STEP3 =
  'Season: In a large bowl toss potatoes with 2 tablespoons olive oil, ' +
  '0.5 teaspoons garlic powder, 0.5 teaspoons smoked paprika, 0.5 ' +
  'teaspoons rosemary or thyme, 0.5 teaspoons black pepper, and 0.8 ' +
  'teaspoons salt until every piece is evenly coated.';

const STEP5 =
  'Roast: Roast at 400°F for 30 minutes. Flip halfway through at the 15 ' +
  'minute mark. Done when edges are deep golden brown and crispy and a ' +
  'fork slides in easily. Sweet potatoes cook slightly faster — check ' +
  'at 20 minutes.';

describe('scaleQuantityDisplay (linear per-serving, round to 1dp)', () => {
  it.each([
    [2, 0.5, '1'],
    [2, 0.75, '1.5'],
    [2, 1, '2'],
    [0.5, 0.5, '0.3'], // 0.25 → 0.3 (round half up)
    [0.5, 0.75, '0.4'], // 0.375 → 0.4
    [0.8, 0.5, '0.4'],
    [0.8, 0.75, '0.6'],
    [0.5, 1, '0.5'], // identity
  ])('%f × %f → "%s"', (amount, factor, expected) => {
    expect(scaleQuantityDisplay(amount * factor)).toBe(expected);
  });
});

describe('rescaleStepText — golden screenshot fixtures', () => {
  it('factor 1 is identity', () => {
    expect(rescaleStepText(STEP3, BASE, 1)).toBe(STEP3);
    expect(rescaleStepText(STEP1, BASE, 1)).toBe(STEP1);
  });

  it('servings 4 → 2 (factor 0.5) reproduces screenshot #9', () => {
    expect(rescaleStepText(STEP3, BASE, 0.5)).toBe(
      'Season: In a large bowl toss potatoes with 1 tablespoons olive ' +
        'oil, 0.3 teaspoons garlic powder, 0.3 teaspoons smoked paprika, ' +
        '0.3 teaspoons rosemary or thyme, 0.3 teaspoons black pepper, ' +
        'and 0.4 teaspoons salt until every piece is evenly coated.',
    );
  });

  it('servings 4 → 3 (factor 0.75) reproduces screenshot #8', () => {
    expect(rescaleStepText(STEP3, BASE, 0.75)).toBe(
      'Season: In a large bowl toss potatoes with 1.5 tablespoons olive ' +
        'oil, 0.4 teaspoons garlic powder, 0.4 teaspoons smoked paprika, ' +
        '0.4 teaspoons rosemary or thyme, 0.4 teaspoons black pepper, ' +
        'and 0.6 teaspoons salt until every piece is evenly coated.',
    );
  });

  it('rescales the ingredient amount but never temps/sizes (step 1)', () => {
    const out = rescaleStepText(STEP1, BASE, 0.5);
    expect(out).toContain('Wash and scrub 1 pounds potatoes');
    expect(out).toContain('Preheat toaster oven to 400°F'); // untouched
    expect(out).toContain('uniform 1-inch cubes'); // untouched
  });

  it('a step with no ingredient quantities is returned verbatim (step 5)', () => {
    // "400°F", "30 minutes", "15 minute", "20 minutes" — no ingredient
    // uses °F or minutes, so nothing rescales.
    expect(rescaleStepText(STEP5, BASE, 0.5)).toBe(STEP5);
    expect(rescaleStepText(STEP5, BASE, 2)).toBe(STEP5);
  });

  it('does not match a bare number inside a longer number', () => {
    // ingredient "2 pounds"; "12 pounds" / "2.5 pounds" must not match.
    const txt = 'Use 12 pounds of crates and a 2.5 pounds weight.';
    expect(rescaleStepText(txt, BASE, 0.5)).toBe(txt);
  });

  it('unit-anchors: "2 tablespoons" scales, a same-number "2 pounds" scales by its own ingredient', () => {
    const txt = 'Add 2 tablespoons olive oil to 2 pounds potatoes or sweet potatoes.';
    expect(rescaleStepText(txt, BASE, 0.5)).toBe(
      'Add 1 tablespoons olive oil to 1 pounds potatoes or sweet potatoes.',
    );
  });
});
