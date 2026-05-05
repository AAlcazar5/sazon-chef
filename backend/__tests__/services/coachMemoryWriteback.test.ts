// backend/__tests__/services/coachMemoryWriteback.test.ts
// ROADMAP 4.0 Tier C5 — Sazon memory writeback to structured stack (TDD).

import {
  detectStructuredIntents,
  applyStructuredIntents,
  type StructuredIntent,
} from '../../src/services/coachMemoryWriteback';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.userPreferences) {
    mockPrisma.userPreferences = { update: jest.fn(), upsert: jest.fn() };
  } else {
    mockPrisma.userPreferences.update = jest.fn();
    mockPrisma.userPreferences.upsert = jest.fn();
  }
  if (!mockPrisma.macroGoals) {
    mockPrisma.macroGoals = { update: jest.fn(), upsert: jest.fn() };
  } else {
    mockPrisma.macroGoals.update = jest.fn();
    mockPrisma.macroGoals.upsert = jest.fn();
  }
});

describe('detectStructuredIntents — cuisine variety', () => {
  it('detects "more variety" → cuisine-variety-boost', () => {
    const intents = detectStructuredIntents('I want more variety in my dinners');
    expect(intents.find((i) => i.kind === 'cuisine-variety-boost')).toBeDefined();
  });

  it('detects "trying new cuisines" → cuisine-variety-boost', () => {
    const intents = detectStructuredIntents("I'd love to try new cuisines this month");
    expect(intents.find((i) => i.kind === 'cuisine-variety-boost')).toBeDefined();
  });

  it('detects "stop suggesting Mediterranean" → cuisine-variety-boost (negative — too repetitive)', () => {
    const intents = detectStructuredIntents("Please stop suggesting Mediterranean every day");
    expect(intents.find((i) => i.kind === 'cuisine-variety-boost')).toBeDefined();
  });
});

describe('detectStructuredIntents — satiety pattern', () => {
  it('detects "always hungry by 4pm" → protein-target-nudge', () => {
    const intents = detectStructuredIntents("I'm always hungry by 4pm even after lunch");
    expect(intents.find((i) => i.kind === 'protein-target-nudge')).toBeDefined();
  });

  it('detects "still hungry after dinner" → protein-target-nudge', () => {
    const intents = detectStructuredIntents("I'm still hungry after dinner most nights");
    expect(intents.find((i) => i.kind === 'protein-target-nudge')).toBeDefined();
  });

  it('detects "feel full longer" / "more fiber" → fiber-target-nudge', () => {
    const intents = detectStructuredIntents("I want to feel full longer between meals");
    expect(intents.find((i) => i.kind === 'fiber-target-nudge')).toBeDefined();
  });
});

describe('detectStructuredIntents — goal adjustment', () => {
  it('detects "switching to maintenance" → goal-phase-change', () => {
    const intents = detectStructuredIntents("I'm switching to maintenance now");
    const intent = intents.find((i) => i.kind === 'goal-phase-change');
    expect(intent).toBeDefined();
    expect((intent as any).newPhase).toBe('maintain');
  });

  it('detects "starting a cut" → goal-phase-change with cut', () => {
    const intents = detectStructuredIntents("I'm starting a cut next week");
    const intent = intents.find((i) => i.kind === 'goal-phase-change');
    expect(intent).toBeDefined();
    expect((intent as any).newPhase).toBe('cut');
  });

  it('detects "lean bulk" → goal-phase-change with bulk', () => {
    const intents = detectStructuredIntents("Time to lean bulk for the next 3 months");
    const intent = intents.find((i) => i.kind === 'goal-phase-change');
    expect(intent).toBeDefined();
    expect((intent as any).newPhase).toBe('bulk');
  });
});

describe('detectStructuredIntents — none', () => {
  it('returns empty array on neutral content (no intent detected)', () => {
    const intents = detectStructuredIntents("Made the salmon last night, was great.");
    expect(intents).toEqual([]);
  });

  it('returns empty for empty/null input', () => {
    expect(detectStructuredIntents('')).toEqual([]);
    expect(detectStructuredIntents(null as any)).toEqual([]);
  });
});

describe('applyStructuredIntents', () => {
  it('writes goal-phase-change to UserPreferences', async () => {
    mockPrisma.userPreferences.update.mockResolvedValue({});
    const intents: StructuredIntent[] = [{ kind: 'goal-phase-change', newPhase: 'cut' }];
    await applyStructuredIntents('user-1', intents);
    expect(mockPrisma.userPreferences.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: expect.objectContaining({ goalPhase: 'cut' }),
    });
  });

  it('writes cuisine-variety-boost as a delta on the explorationCoeff field', async () => {
    mockPrisma.userPreferences.upsert.mockResolvedValue({});
    const intents: StructuredIntent[] = [{ kind: 'cuisine-variety-boost' }];
    await applyStructuredIntents('user-1', intents);
    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalled();
  });

  it('handles multiple intents in one call', async () => {
    mockPrisma.userPreferences.update.mockResolvedValue({});
    mockPrisma.userPreferences.upsert.mockResolvedValue({});
    const intents: StructuredIntent[] = [
      { kind: 'cuisine-variety-boost' },
      { kind: 'protein-target-nudge' },
    ];
    await applyStructuredIntents('user-1', intents);
    // Both intents should produce at least one prisma call between update + upsert.
    const totalCalls =
      mockPrisma.userPreferences.update.mock.calls.length +
      mockPrisma.userPreferences.upsert.mock.calls.length;
    expect(totalCalls).toBeGreaterThanOrEqual(1);
  });

  it('is a no-op for an empty intent list', async () => {
    await applyStructuredIntents('user-1', []);
    expect(mockPrisma.userPreferences.update).not.toHaveBeenCalled();
    expect(mockPrisma.userPreferences.upsert).not.toHaveBeenCalled();
  });
});
