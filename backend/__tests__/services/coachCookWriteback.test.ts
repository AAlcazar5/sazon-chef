// W-B1 — Cook Mode in coach chat. The chat turn writes structured CookEvents
// via the same detect→apply writeback pattern as coachMemoryWriteback. These
// tests are RED-first: the service does not exist yet.
//
// Acceptance (roadmap W-B1 **Test:**):
//   - in-chat cook flow writes structured events via the writeback path
//   - IDOR: the acting userId is the only scope an event can be written under
//     (user B's chat can never append into user A's Cook Log)

jest.mock('../../src/services/cookEventService', () => ({
  recordCookEvent: jest.fn().mockResolvedValue({ id: 'evt_1' }),
}));

import { recordCookEvent } from '../../src/services/cookEventService';
import {
  detectCookIntents,
  applyCookIntents,
} from '../../src/services/coachCookWriteback';

const mockedRecord = recordCookEvent as jest.MockedFunction<
  typeof recordCookEvent
>;

beforeEach(() => {
  mockedRecord.mockClear();
  mockedRecord.mockResolvedValue({ id: 'evt_1' } as never);
});

describe('detectCookIntents (pure)', () => {
  it('detects "made it"', () => {
    expect(detectCookIntents('I made it last night, turned out great')).toEqual(
      [{ kind: 'made_it' }],
    );
  });

  it('detects scale factor (doubled/halved)', () => {
    expect(detectCookIntents('I doubled the recipe for the party')).toEqual([
      { kind: 'scale', factor: 2 },
    ]);
    expect(detectCookIntents('halved it since it was just me')).toEqual([
      { kind: 'scale', factor: 0.5 },
    ]);
  });

  it('detects scale to N servings', () => {
    expect(detectCookIntents('scaled it to 6 servings')).toEqual([
      { kind: 'scale', servings: 6 },
    ]);
  });

  it('detects a swap', () => {
    expect(detectCookIntents('I swapped chicken for tofu')).toEqual([
      { kind: 'swap', from: 'chicken', to: 'tofu' },
    ]);
    expect(detectCookIntents('used tofu instead of chicken')).toEqual([
      { kind: 'swap', from: 'tofu', to: 'chicken' },
    ]);
  });

  it('detects an explicit note', () => {
    expect(detectCookIntents('note: needs more salt next time')).toEqual([
      { kind: 'note', text: 'needs more salt next time' },
    ]);
  });

  it('returns [] for generic chat and non-strings', () => {
    expect(detectCookIntents('what should I cook tonight?')).toEqual([]);
    expect(detectCookIntents('')).toEqual([]);
    expect(detectCookIntents(null)).toEqual([]);
    expect(detectCookIntents(42)).toEqual([]);
  });

  it('dedupes identical intents', () => {
    expect(detectCookIntents('I made it. I made it!')).toEqual([
      { kind: 'made_it' },
    ]);
  });
});

describe('applyCookIntents (side-effect)', () => {
  it('records one CookEvent per intent, scoped to the acting userId', async () => {
    await applyCookIntents('user_A', 'recipe_9', [
      { kind: 'made_it' },
      { kind: 'swap', from: 'chicken', to: 'tofu' },
    ]);

    expect(mockedRecord).toHaveBeenCalledTimes(2);
    expect(mockedRecord).toHaveBeenNthCalledWith(1, {
      userId: 'user_A',
      recipeId: 'recipe_9',
      type: 'made_it',
      payload: { source: 'coach_chat' },
    });
    expect(mockedRecord).toHaveBeenNthCalledWith(2, {
      userId: 'user_A',
      recipeId: 'recipe_9',
      type: 'swap',
      payload: { source: 'coach_chat', from: 'chicken', to: 'tofu' },
    });
  });

  it('passes null recipeId through (the §9a no-recipe cook path)', async () => {
    await applyCookIntents('user_A', null, [{ kind: 'made_it' }]);
    expect(mockedRecord).toHaveBeenCalledWith({
      userId: 'user_A',
      recipeId: null,
      type: 'made_it',
      payload: { source: 'coach_chat' },
    });
  });

  it('IDOR: only ever writes under the userId it was called with', async () => {
    await applyCookIntents('user_B', null, [{ kind: 'made_it' }]);
    const call = mockedRecord.mock.calls[0][0];
    expect(call.userId).toBe('user_B');
    // never user_A
    expect(mockedRecord).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_A' }),
    );
  });

  it('no intents → no writes', async () => {
    await applyCookIntents('user_A', null, []);
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('never throws into the caller if a record fails (stream-safe)', async () => {
    mockedRecord.mockRejectedValueOnce(new Error('db down'));
    await expect(
      applyCookIntents('user_A', null, [
        { kind: 'made_it' },
        { kind: 'note', text: 'second one still attempted' },
      ]),
    ).resolves.toBeUndefined();
    // the failure of the first must not prevent the second
    expect(mockedRecord).toHaveBeenCalledTimes(2);
  });
});
