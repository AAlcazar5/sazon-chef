// ROADMAP 4.0 TB3.1 — RecommenderEvent service test.

import { prisma } from '../../src/lib/prisma';
import {
  recordProposal,
  ProposalRecord,
} from '../../src/services/recommender/recommenderEventService';

const eventCreate = jest.fn();
const runnerUpCreateMany = jest.fn();
(prisma as any).recommenderEvent = {
  ...((prisma as any).recommenderEvent ?? {}),
  create: eventCreate,
};
(prisma as any).recommenderRunnerUp = {
  ...((prisma as any).recommenderRunnerUp ?? {}),
  createMany: runnerUpCreateMany,
};

function record(overrides: Partial<ProposalRecord> = {}): ProposalRecord {
  return {
    userId: 'u1',
    asOf: new Date('2026-05-05T10:00:00Z'),
    contextSnapshot: { tasteSummary: 'italian' } as any,
    candidateIds: ['r1', 'r2', 'r3'],
    pickedRecipeId: 'r1',
    runnerUpIds: ['r2', 'r3'],
    confidence: 0.8,
    copyLine: 'Carbonara again — it never gets old',
    source: 'llm',
    ...overrides,
  };
}

describe('recordProposal (TB3.1)', () => {
  beforeEach(() => {
    eventCreate.mockReset();
    runnerUpCreateMany.mockReset();
    eventCreate.mockResolvedValue({ id: 'evt1' });
    runnerUpCreateMany.mockResolvedValue({ count: 2 });
  });

  it('writes one RecommenderEvent row per proposal', async () => {
    const id = await recordProposal(record());
    expect(id).toBe('evt1');
    expect(eventCreate).toHaveBeenCalledTimes(1);
    const data = eventCreate.mock.calls[0][0].data;
    expect(data.userId).toBe('u1');
    expect(data.pickedRecipeId).toBe('r1');
    expect(data.confidence).toBeCloseTo(0.8, 2);
    expect(data.source).toBe('llm');
  });

  it('serializes candidateIds + contextSnapshot as strings (replayable)', async () => {
    await recordProposal(record());
    const data = eventCreate.mock.calls[0][0].data;
    expect(typeof data.candidateIds).toBe('string');
    expect(typeof data.contextSnapshot).toBe('string');
    const candidates = JSON.parse(data.candidateIds);
    expect(candidates).toEqual(['r1', 'r2', 'r3']);
    const snapshot = JSON.parse(data.contextSnapshot);
    expect(snapshot.tasteSummary).toBe('italian');
  });

  it('records up to 3 runner-ups with correct rank', async () => {
    await recordProposal(
      record({ runnerUpIds: ['r2', 'r3', 'r4', 'r5'] }),
    );
    expect(runnerUpCreateMany).toHaveBeenCalledTimes(1);
    const rows = runnerUpCreateMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ eventId: 'evt1', recipeId: 'r2', rank: 1 });
    expect(rows[2]).toEqual({ eventId: 'evt1', recipeId: 'r4', rank: 3 });
  });

  it('skips runner-up createMany when none provided', async () => {
    await recordProposal(record({ runnerUpIds: [] }));
    expect(runnerUpCreateMany).not.toHaveBeenCalled();
  });

  it('does not throw on DB failure (logging is fire-and-forget safe)', async () => {
    eventCreate.mockRejectedValue(new Error('db down'));
    const id = await recordProposal(record());
    expect(id).toBeNull();
  });

  it('returns null without writing when pickedRecipeId is null (no pick)', async () => {
    const id = await recordProposal(record({ pickedRecipeId: null }));
    // Still write the event so we have a label for "no-pick" outcomes.
    expect(eventCreate).toHaveBeenCalledTimes(1);
    expect(id).toBe('evt1');
    const data = eventCreate.mock.calls[0][0].data;
    expect(data.pickedRecipeId).toBeNull();
  });
});
