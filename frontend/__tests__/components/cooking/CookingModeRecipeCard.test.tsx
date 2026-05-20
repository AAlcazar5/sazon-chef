// Tier Y-3 — the headline replica: the in-chat Cooking Mode recipe card.
// The defining behavior (founder screenshots): the servings stepper
// rescales the ingredient list AND the quantities in step prose in
// lockstep, while temps/times stay put. RED-first.

const mockHaptic = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...a: unknown[]) => mockHaptic(...a),
  notificationAsync: (...a: unknown[]) => mockHaptic(...a),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

// Founder ask 2026-05-20 round 14: stub the print + clipboard native
// modules so tests don't try to invoke them.
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-print', () => ({
  printAsync: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import CookingModeRecipeCard from '../../../components/cooking/CookingModeRecipeCard';

const PROPS = {
  title: 'Roasted Potatoes',
  description: 'Crispy, protein-packed snack.',
  baseServings: 4,
  ingredients: [
    { name: 'potatoes or sweet potatoes', amount: 2, unit: 'pounds' },
    { name: 'olive oil', amount: 2, unit: 'tablespoons' },
    { name: 'garlic powder', amount: 0.5, unit: 'teaspoons' },
    { name: 'salt', amount: 0.8, unit: 'teaspoons' },
  ],
  steps: [
    'Prep: scrub 2 pounds potatoes or sweet potatoes.',
    'Season: toss with 2 tablespoons olive oil, 0.5 teaspoons garlic powder, and 0.8 teaspoons salt.',
    'Roast at 400°F for 30 minutes.',
  ],
  macros: { calories: 160, protein: 10, carbs: 18, fat: 6, fiber: 6 },
  notes: 'Cool completely before eating for maximum crunch.',
  onGetCooking: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('<CookingModeRecipeCard />', () => {
  it('renders header, ingredients, steps, and per-serving macros', () => {
    const { getByText, getAllByText, getByLabelText } = render(
      <CookingModeRecipeCard {...PROPS} />,
    );
    expect(getByText('Roasted Potatoes')).toBeTruthy();
    expect(getByText('Crispy, protein-packed snack.')).toBeTruthy();
    // appears twice — ingredient line + step 1 prose (proves both render
    // off the same base)
    expect(getAllByText(/2 pounds potatoes or sweet potatoes/)).toHaveLength(2);
    expect(getByText(/Roast at 400°F for 30 minutes/)).toBeTruthy();
    expect(getByText(/160/)).toBeTruthy(); // macros NOTES (per serving)
    expect(getByLabelText(/Roasted Potatoes recipe/i)).toBeTruthy();
  });

  it('servings stepper rescales the ingredient LIST and step PROSE in lockstep; temps untouched', () => {
    const { getByText, getAllByText, getByLabelText, queryByText } = render(
      <CookingModeRecipeCard {...PROPS} />,
    );
    // base = 4 servings — phrase in both ingredient line + step 1
    expect(getAllByText(/2 pounds potatoes or sweet potatoes/)).toHaveLength(2);
    expect(
      getByText(/toss with 2 tablespoons olive oil, 0.5 teaspoons garlic powder, and 0.8 teaspoons salt/),
    ).toBeTruthy();

    // 4 → 2 (press Decrease twice)
    fireEvent.press(getByLabelText('Decrease servings'));
    fireEvent.press(getByLabelText('Decrease servings'));

    // ingredient list AND step 1 rescaled in lockstep (both → 2 nodes)
    expect(getAllByText(/1 pounds potatoes or sweet potatoes/)).toHaveLength(2);
    expect(queryByText(/2 pounds potatoes or sweet potatoes/)).toBeNull();
    // step prose rescaled IN LOCKSTEP with the list
    expect(
      getByText(/toss with 1 tablespoons olive oil, 0.3 teaspoons garlic powder, and 0.4 teaspoons salt/),
    ).toBeTruthy();
    // temps/times structurally untouched
    expect(getByText(/Roast at 400°F for 30 minutes/)).toBeTruthy();
  });

  it('Get cooking is labelled and fires its handler', () => {
    const onGetCooking = jest.fn();
    const { getByLabelText } = render(
      <CookingModeRecipeCard {...PROPS} onGetCooking={onGetCooking} />,
    );
    const btn = getByLabelText(/get cooking/i);
    expect(btn.props.accessibilityRole).toBe('button');
    fireEvent.press(btn);
    expect(onGetCooking).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing in dark theme and with no images', () => {
    const { getByText } = render(
      <CookingModeRecipeCard {...PROPS} imageUrls={undefined} />,
    );
    expect(getByText('Roasted Potatoes')).toBeTruthy();
  });

  // Y-Live-4 — kitchen-mode "ruler" units menu: As written / US / Metric.
  // Only affects the ingredient list display; step prose keeps the
  // original base units (so rescaleStepText/Y-1 still anchors).
  describe('units toggle (Y-Live-4)', () => {
    it('renders a labelled units button; menu opens on tap', () => {
      const { getByLabelText, queryByLabelText } = render(
        <CookingModeRecipeCard {...PROPS} />,
      );
      // Menu is closed initially.
      expect(queryByLabelText(/^As written$/)).toBeNull();
      const trigger = getByLabelText('Change units');
      expect(trigger.props.accessibilityRole).toBe('button');
      fireEvent.press(trigger);
      // 3 options now visible.
      expect(getByLabelText(/^As written$/)).toBeTruthy();
      expect(getByLabelText(/^US$/)).toBeTruthy();
      expect(getByLabelText(/^Metric$/)).toBeTruthy();
    });

    it('selecting Metric converts the ingredient list (step prose untouched)', () => {
      const { getByLabelText, getByText, queryByText, getAllByText } = render(
        <CookingModeRecipeCard {...PROPS} />,
      );
      // Initially "2 pounds potatoes…" appears in BOTH the ingredient
      // line and step 1 prose (2 nodes).
      expect(getAllByText(/2 pounds potatoes or sweet potatoes/)).toHaveLength(2);
      // Open menu, pick Metric.
      fireEvent.press(getByLabelText('Change units'));
      fireEvent.press(getByLabelText(/^Metric$/));
      // Ingredient list now in g (907.2 = 2 lb × 453.6); but step prose
      // intentionally retains "2 pounds potatoes…" so the lockstep
      // servings rescale (Y-1) still anchors correctly.
      expect(getByText(/907\.2 g potatoes or sweet potatoes/)).toBeTruthy();
      // Only ONE remaining "2 pounds potatoes…" — the one in step 1 prose.
      expect(getAllByText(/2 pounds potatoes or sweet potatoes/)).toHaveLength(1);
      // The previous tablespoons → ml (2 tbsp × 15 = 30).
      expect(queryByText(/30 ml olive oil/)).toBeTruthy();
    });

    it('"As written" restores identity; selecting it after Metric reverts', () => {
      const { getByLabelText, getAllByText } = render(
        <CookingModeRecipeCard {...PROPS} />,
      );
      fireEvent.press(getByLabelText('Change units'));
      fireEvent.press(getByLabelText(/^Metric$/));
      // Now reopen + pick As written.
      fireEvent.press(getByLabelText('Change units'));
      fireEvent.press(getByLabelText(/^As written$/));
      // Both ingredient line + step prose back to pounds — 2 nodes again.
      expect(getAllByText(/2 pounds potatoes or sweet potatoes/)).toHaveLength(2);
    });
  });

  // Founder ask 2026-05-19 — N=1 ranker surfaces rationale + swap chip
  // for ambiguous recipe asks. Cold-start (no rationale, pool size ≤ 1)
  // must hide both elements so the card doesn't look incomplete.
  describe('N=1 personalization affordances', () => {
    it('renders rationale subtitle under the title when provided', () => {
      const { getByText, queryByText } = render(
        <CookingModeRecipeCard
          {...PROPS}
          rationale="Picked because you've got onion + garlic on hand."
        />,
      );
      expect(getByText(/Picked because you've got onion \+ garlic/)).toBeTruthy();
      // No rationale prop → no element (verified in the next test).
      expect(queryByText(/Picked because/)).toBeTruthy();
    });

    it('omits rationale when prop is undefined (cold-start)', () => {
      const { queryByText } = render(<CookingModeRecipeCard {...PROPS} />);
      expect(queryByText(/Picked because/)).toBeNull();
    });

    it('renders "Show me another · N/M" chip when swap pool > 1; fires onSwap', () => {
      const onSwap = jest.fn();
      const { getByLabelText, getByText } = render(
        <CookingModeRecipeCard
          {...PROPS}
          onSwap={onSwap}
          swapPoolSize={3}
          swapIndex={0}
        />,
      );
      expect(getByText(/Show me another · 1\/3/)).toBeTruthy();
      fireEvent.press(getByLabelText(/Show me another recipe/i));
      expect(onSwap).toHaveBeenCalledTimes(1);
    });

    it('hides swap chip when pool size ≤ 1 (AI-gen-only result)', () => {
      const { queryByText } = render(
        <CookingModeRecipeCard {...PROPS} swapPoolSize={1} swapIndex={0} />,
      );
      expect(queryByText(/Show me another/)).toBeNull();
    });

    it('hides swap chip when onSwap not provided', () => {
      const { queryByText } = render(
        <CookingModeRecipeCard {...PROPS} swapPoolSize={3} swapIndex={0} />,
      );
      expect(queryByText(/Show me another/)).toBeNull();
    });
  });

  // Founder bug 2026-05-20 (screenshot): AI-gen recipes arrived with no
  // imageUrls and the photo slot disappeared entirely, leaving the card
  // visually flat. The card now renders a cuisine-tinted gradient
  // placeholder + emoji + cuisine label so the photo slot anchors the
  // card whether or not a real photo is available.
  describe('photo placeholder (founder bug 2026-05-20)', () => {
    it('shows a cuisine-tinted placeholder with emoji + label when no images', () => {
      const { getByText } = render(
        <CookingModeRecipeCard {...PROPS} imageUrls={undefined} cuisine="Italian" />,
      );
      // Italian's emoji is 🍝 per CATEGORY_COLORS, label = "Italian".
      expect(getByText('🍝')).toBeTruthy();
      expect(getByText('Italian')).toBeTruthy();
    });

    it('falls back to "American" cuisine when the recipe cuisine is missing', () => {
      const { getByText } = render(
        <CookingModeRecipeCard {...PROPS} imageUrls={undefined} />,
      );
      expect(getByText('🍔')).toBeTruthy(); // American emoji
      expect(getByText('American')).toBeTruthy();
    });

    it('falls back to "American" when cuisine is unknown to CATEGORY_COLORS', () => {
      const { getByText } = render(
        <CookingModeRecipeCard
          {...PROPS}
          imageUrls={undefined}
          cuisine="Martian"
        />,
      );
      expect(getByText('🍔')).toBeTruthy();
      expect(getByText('American')).toBeTruthy();
    });

    it('does NOT show the placeholder when real images are provided', () => {
      const { queryByText } = render(
        <CookingModeRecipeCard
          {...PROPS}
          imageUrls={['https://example.com/p.jpg']}
          cuisine="Italian"
        />,
      );
      // Italian emoji + label only render in the placeholder branch.
      expect(queryByText('🍝')).toBeNull();
    });
  });

  // Founder bug 2026-05-20 (round 9): bigger photos + horizontal
  // carousel. Multi-image path renders a paged horizontal ScrollView
  // with page-indicator dots; single-image path stays as hero.
  describe('horizontal carousel (multi-image path)', () => {
    it('renders a peek-style photo strip ScrollView when 2+ images provided', () => {
      const { getByLabelText } = render(
        <CookingModeRecipeCard
          {...PROPS}
          imageUrls={[
            'https://example.com/a.jpg',
            'https://example.com/b.jpg',
            'https://example.com/c.jpg',
          ]}
        />,
      );
      // Founder ask 2026-05-20 round 13: photo strip uses 2/3 + 1/3
      // peek (was full-width paging). Label updated to "swipe for next".
      expect(getByLabelText(/photos — swipe for next/i)).toBeTruthy();
    });

    // Founder ask 2026-05-20 round 14: print + copy icons next to the
    // units icon. Each is keyboard/screen-reader labelled.
    it('renders Print + Copy icon buttons alongside the units button', () => {
      const { getByLabelText } = render(
        <CookingModeRecipeCard {...PROPS} imageUrls={['https://example.com/a.jpg']} />,
      );
      expect(getByLabelText('Change units')).toBeTruthy();
      expect(getByLabelText('Print recipe')).toBeTruthy();
      expect(getByLabelText('Copy recipe')).toBeTruthy();
    });

    it('tapping Copy writes the formatted recipe to the clipboard', async () => {
      const Clipboard = require('expo-clipboard');
      Clipboard.setStringAsync.mockClear();
      const { getByLabelText } = render(<CookingModeRecipeCard {...PROPS} />);
      fireEvent.press(getByLabelText('Copy recipe'));
      // setStringAsync is awaited inside the handler; let the
      // microtask queue drain.
      await new Promise((r) => setTimeout(r, 0));
      expect(Clipboard.setStringAsync).toHaveBeenCalledTimes(1);
      const arg = Clipboard.setStringAsync.mock.calls[0][0] as string;
      // The plain-text dump should include the title, ingredients, and steps.
      expect(arg).toMatch(/ROASTED POTATOES/);
      expect(arg).toMatch(/INGREDIENTS/);
      expect(arg).toMatch(/STEPS/);
    });

    it('tapping Print invokes expo-print with HTML', async () => {
      const PrintMod = require('expo-print');
      PrintMod.printAsync.mockClear();
      const { getByLabelText } = render(<CookingModeRecipeCard {...PROPS} />);
      fireEvent.press(getByLabelText('Print recipe'));
      await new Promise((r) => setTimeout(r, 0));
      expect(PrintMod.printAsync).toHaveBeenCalledTimes(1);
      const arg = PrintMod.printAsync.mock.calls[0][0];
      expect(arg.html).toMatch(/<h1>Roasted Potatoes<\/h1>/);
      expect(arg.html).toMatch(/Ingredients/i);
    });

    it('single-image path stays hero (no photo-strip ScrollView)', () => {
      const { queryByLabelText } = render(
        <CookingModeRecipeCard
          {...PROPS}
          imageUrls={['https://example.com/a.jpg']}
        />,
      );
      expect(queryByLabelText(/photos — swipe for next/i)).toBeNull();
    });
  });
});
