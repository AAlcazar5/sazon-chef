// ROADMAP 4.0 A7.4 — welcomeBackService test.

import { prisma } from '../../src/lib/prisma';
import {
  pickWelcomeBackPeak,
  __INTERNALS,
} from '../../src/services/welcomeBackService';
import {
  assertLifestyleVoice,
} from '../../src/services/voice/bannedVocabularyCorpus';

const findFirst = jest.fn();
(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  findFirst,
};

const NOW = new Date('2026-05-08T12:00:00Z'); // Friday
const dayOffset = (d: number) => new Date(NOW.getTime() + d * 86400000);

beforeEach(() => {
  findFirst.mockReset();
});

describe('A7.4 — pickWelcomeBackPeak', () => {
  it('returns null for empty userId', async () => {
    expect(await pickWelcomeBackPeak({ userId: '' })).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('returns null when the user has no prior cooks', async () => {
    findFirst.mockResolvedValue(null);
    expect(
      await pickWelcomeBackPeak({ userId: 'u1', now: NOW }),
    ).toBeNull();
  });

  it('suppresses the peak when last cook was within 2 days', async () => {
    findFirst.mockResolvedValue({
      cookedAt: dayOffset(-1),
      recipe: { cuisine: 'Persian' },
    });
    expect(
      await pickWelcomeBackPeak({ userId: 'u1', now: NOW }),
    ).toBeNull();
  });

  it('suppresses at exactly the boundary (1 day = within 2-day window)', async () => {
    findFirst.mockResolvedValue({
      cookedAt: dayOffset(-1),
      recipe: { cuisine: 'Persian' },
    });
    expect(
      await pickWelcomeBackPeak({ userId: 'u1', now: NOW }),
    ).toBeNull();
  });

  it('renders the cuisine + day-of-week peak when last cook ≥ 2 days ago', async () => {
    findFirst.mockResolvedValue({
      cookedAt: dayOffset(-4),
      recipe: { cuisine: 'Persian' },
    });
    const peak = await pickWelcomeBackPeak({ userId: 'u1', now: NOW });
    expect(peak).not.toBeNull();
    expect(peak!.cuisine).toBe('Persian');
    expect(peak!.daysSinceLastCook).toBe(4);
    expect(peak!.message).toContain('Welcome back');
    expect(peak!.message).toContain('4 days');
    expect(peak!.message).toContain('Persian');
    expect(peak!.message).toContain('Friday'); // 2026-05-08 is Friday
  });

  it('renders the no-cuisine fallback when the last cook has no cuisine', async () => {
    findFirst.mockResolvedValue({
      cookedAt: dayOffset(-5),
      recipe: { cuisine: null },
    });
    const peak = await pickWelcomeBackPeak({ userId: 'u1', now: NOW });
    expect(peak).not.toBeNull();
    expect(peak!.cuisine).toBeNull();
    expect(peak!.message).toContain('Welcome back');
    expect(peak!.message.toLowerCase()).toContain("what's the move");
  });

  it('lifestyle voice — message passes the banned-vocab corpus', async () => {
    findFirst.mockResolvedValue({
      cookedAt: dayOffset(-3),
      recipe: { cuisine: 'Italian' },
    });
    const peak = await pickWelcomeBackPeak({ userId: 'u1', now: NOW });
    expect(peak).not.toBeNull();
    expect(() => assertLifestyleVoice(peak!.message)).not.toThrow();
  });

  it('publishes the suppression threshold for inspection', () => {
    expect(__INTERNALS.SUPPRESS_WHEN_COOKED_WITHIN_DAYS).toBe(2);
  });

  it('handles a cook from a long time ago without overflow', async () => {
    findFirst.mockResolvedValue({
      cookedAt: dayOffset(-90),
      recipe: { cuisine: 'Thai' },
    });
    const peak = await pickWelcomeBackPeak({ userId: 'u1', now: NOW });
    expect(peak!.daysSinceLastCook).toBe(90);
  });

  it('strips whitespace from cuisine values', async () => {
    findFirst.mockResolvedValue({
      cookedAt: dayOffset(-3),
      recipe: { cuisine: '  Italian  ' },
    });
    const peak = await pickWelcomeBackPeak({ userId: 'u1', now: NOW });
    expect(peak!.cuisine).toBe('Italian');
    expect(peak!.message).toContain('Italian');
  });

  it('treats empty-string cuisine as null (falls back to no-cuisine copy)', async () => {
    findFirst.mockResolvedValue({
      cookedAt: dayOffset(-3),
      recipe: { cuisine: '   ' },
    });
    const peak = await pickWelcomeBackPeak({ userId: 'u1', now: NOW });
    expect(peak!.cuisine).toBeNull();
    expect(peak!.message.toLowerCase()).toContain("what's the move");
  });
});
