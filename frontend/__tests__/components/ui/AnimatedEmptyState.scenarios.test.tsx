// frontend/__tests__/components/ui/AnimatedEmptyState.scenarios.test.tsx
// ROADMAP 4.0 Tier J6 — Empty-state mini-stories (TDD).
//
// Audits the 6 launch-critical empty-state scenarios listed in the J6 spec to
// ensure each has illustrated mascot + invitational copy + a single CTA. Drives
// the "utility is the floor; delight is the bar" rule for empty states.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import {
  PantryEmptyStates,
  PlateHistoryEmptyStates,
  SazonThreadEmptyStates,
  CookbookEmptyStates,
  ShoppingListEmptyStates,
} from '../../../constants/EmptyStates';

const SCENARIOS = [
  { name: 'pantry empty', config: PantryEmptyStates.empty },
  { name: 'saved (cookbook) empty', config: CookbookEmptyStates.noSavedRecipes },
  { name: 'collections empty', config: CookbookEmptyStates.noCollections },
  { name: 'shopping empty', config: ShoppingListEmptyStates.emptyList },
  { name: 'plate history empty', config: PlateHistoryEmptyStates.empty },
  { name: 'sazon thread empty', config: SazonThreadEmptyStates.empty },
];

describe('Empty-state scenarios (J6)', () => {
  test.each(SCENARIOS)('%s ships title + description + actionLabel + mascot + pastel tint', ({ config }) => {
    expect(config.title).toBeTruthy();
    expect(config.title.length).toBeGreaterThan(0);
    expect(config.description).toBeTruthy();
    expect(config.description.length).toBeGreaterThan(10);
    expect(config.actionLabel).toBeTruthy();
    expect(config.useMascot).toBe(true);
    expect(config.mascotExpression).toBeTruthy();
    expect(config.pastelTint).toBeTruthy();
    expect(config.pastelTintDark).toBeTruthy();
  });

  test.each(SCENARIOS)('%s uses lifestyle voice (no verdict tone)', ({ config }) => {
    const lower = `${config.title} ${config.description}`.toLowerCase();
    const banned = [
      "you're under",
      "you're over",
      'you missed',
      'you failed',
      'you exceeded',
      'macro-friendly',
    ];
    for (const phrase of banned) {
      expect(lower).not.toContain(phrase);
    }
  });

  it('pantry empty references "cupboard" or stocking framing', () => {
    const text = `${PantryEmptyStates.empty.title} ${PantryEmptyStates.empty.description}`.toLowerCase();
    const matchesFraming = /(cupboard|stock)/.test(text);
    expect(matchesFraming).toBe(true);
  });

  it('plate history empty invites the user to build their first plate', () => {
    const text = `${PlateHistoryEmptyStates.empty.title} ${PlateHistoryEmptyStates.empty.description}`.toLowerCase();
    expect(text).toMatch(/plate/i);
    expect(text).toMatch(/(first|build)/i);
  });

  it('sazon thread empty invites a conversation', () => {
    const text = `${SazonThreadEmptyStates.empty.title} ${SazonThreadEmptyStates.empty.description}`.toLowerCase();
    expect(text).toMatch(/(ask|thread|conversation|stuck)/i);
  });
});
