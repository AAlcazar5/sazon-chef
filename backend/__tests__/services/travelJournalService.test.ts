// ROADMAP 4.0 G2.3 — "What I ate" travel journal service.
//
// Per-user log of meals eaten while traveling. Default private. Opt-in
// to share with friends or contribute anonymized to global adjacency.

const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    travelJournalEntry: {
      create: (...a: unknown[]) => mockCreate(...a),
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

import {
  recordEntry,
  getEntriesForUser,
  shareWithFriends,
  contributeAnonymized,
  MAX_DISH_NAME_LEN,
  MAX_NOTE_LEN,
} from '../../src/services/travelJournalService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('recordEntry', () => {
  it('persists with sane defaults', async () => {
    mockCreate.mockResolvedValue({
      id: 'e1',
      userId: 'u1',
      occurredAt: new Date('2026-05-08T18:00:00Z'),
      citySlug: 'cdmx',
      dishName: 'Mole poblano',
      cuisineTag: 'oaxacan',
      photoUri: null,
      note: null,
      isPrivate: true,
      sharedWithFriendsAt: null,
      contributedAnonymizedAt: null,
    });

    const result = await recordEntry({
      userId: 'u1',
      citySlug: 'cdmx',
      dishName: 'Mole poblano',
      cuisineTag: 'oaxacan',
    });

    expect(result.id).toBe('e1');
    expect(mockCreate).toHaveBeenCalled();
    const args = mockCreate.mock.calls[0][0];
    expect(args.data.userId).toBe('u1');
    expect(args.data.dishName).toBe('Mole poblano');
    expect(args.data.cuisineTag).toBe('oaxacan');
    // citySlug normalized to lowercase
    expect(args.data.citySlug).toBe('cdmx');
    // isPrivate defaults to true
    expect(args.data.isPrivate).toBe(true);
  });

  it('lowercases cuisineTag and citySlug', async () => {
    mockCreate.mockResolvedValue({ id: 'e1' });
    await recordEntry({
      userId: 'u1',
      citySlug: 'CDMX',
      dishName: 'Mole',
      cuisineTag: 'OAXACAN',
    });
    const args = mockCreate.mock.calls[0][0];
    expect(args.data.citySlug).toBe('cdmx');
    expect(args.data.cuisineTag).toBe('oaxacan');
  });

  it('trims dishName and note whitespace', async () => {
    mockCreate.mockResolvedValue({ id: 'e1' });
    await recordEntry({
      userId: 'u1',
      dishName: '  Mole poblano  ',
      note: '  best of trip  ',
    });
    const args = mockCreate.mock.calls[0][0];
    expect(args.data.dishName).toBe('Mole poblano');
    expect(args.data.note).toBe('best of trip');
  });

  it('rejects empty userId', async () => {
    await expect(
      recordEntry({ userId: '', dishName: 'X' }),
    ).rejects.toThrow(/userId/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects empty dishName after trim', async () => {
    await expect(
      recordEntry({ userId: 'u1', dishName: '   ' }),
    ).rejects.toThrow(/dishName/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects oversized dishName', async () => {
    const tooLong = 'x'.repeat(MAX_DISH_NAME_LEN + 1);
    await expect(
      recordEntry({ userId: 'u1', dishName: tooLong }),
    ).rejects.toThrow(/dishName.*length|too long/i);
  });

  it('rejects oversized note', async () => {
    const tooLong = 'x'.repeat(MAX_NOTE_LEN + 1);
    await expect(
      recordEntry({ userId: 'u1', dishName: 'X', note: tooLong }),
    ).rejects.toThrow(/note.*length|too long/i);
  });

  it('honors isPrivate=false override', async () => {
    mockCreate.mockResolvedValue({ id: 'e1' });
    await recordEntry({
      userId: 'u1',
      dishName: 'X',
      isPrivate: false,
    });
    const args = mockCreate.mock.calls[0][0];
    expect(args.data.isPrivate).toBe(false);
  });

  it('uses provided occurredAt', async () => {
    mockCreate.mockResolvedValue({ id: 'e1' });
    const when = new Date('2026-05-01T12:00:00Z');
    await recordEntry({
      userId: 'u1',
      dishName: 'X',
      occurredAt: when,
    });
    const args = mockCreate.mock.calls[0][0];
    expect(args.data.occurredAt).toEqual(when);
  });
});

describe('getEntriesForUser', () => {
  it('returns entries ordered most-recent-first', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'e2', occurredAt: new Date('2026-05-08T12:00:00Z') },
      { id: 'e1', occurredAt: new Date('2026-05-01T12:00:00Z') },
    ]);
    const result = await getEntriesForUser({ userId: 'u1' });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('e2');
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where.userId).toBe('u1');
    expect(args.orderBy).toEqual({ occurredAt: 'desc' });
  });

  it('honors since filter', async () => {
    mockFindMany.mockResolvedValue([]);
    const since = new Date('2026-05-01T00:00:00Z');
    await getEntriesForUser({ userId: 'u1', since });
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where.occurredAt).toEqual({ gte: since });
  });

  it('honors limit', async () => {
    mockFindMany.mockResolvedValue([]);
    await getEntriesForUser({ userId: 'u1', limit: 25 });
    const args = mockFindMany.mock.calls[0][0];
    expect(args.take).toBe(25);
  });

  it('rejects empty userId', async () => {
    await expect(getEntriesForUser({ userId: '' })).rejects.toThrow(/userId/i);
  });
});

describe('shareWithFriends', () => {
  it('flips isPrivate=false + stamps sharedWithFriendsAt', async () => {
    mockFindUnique.mockResolvedValue({ id: 'e1', userId: 'u1' });
    mockUpdate.mockResolvedValue({
      id: 'e1',
      isPrivate: false,
      sharedWithFriendsAt: new Date('2026-05-08T20:00:00Z'),
    });
    const result = await shareWithFriends({ userId: 'u1', entryId: 'e1' });
    expect(result.isPrivate).toBe(false);
    expect(result.sharedWithFriendsAt).toBeTruthy();
    const args = mockUpdate.mock.calls[0][0];
    expect(args.data.isPrivate).toBe(false);
    expect(args.data.sharedWithFriendsAt).toBeInstanceOf(Date);
  });

  it('rejects when entry belongs to another user (privacy)', async () => {
    mockFindUnique.mockResolvedValue({ id: 'e1', userId: 'other-user' });
    await expect(
      shareWithFriends({ userId: 'u1', entryId: 'e1' }),
    ).rejects.toThrow(/forbidden|not found/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects when entry does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(
      shareWithFriends({ userId: 'u1', entryId: 'missing' }),
    ).rejects.toThrow(/not found/i);
  });
});

describe('contributeAnonymized', () => {
  it('stamps contributedAnonymizedAt', async () => {
    mockFindUnique.mockResolvedValue({ id: 'e1', userId: 'u1' });
    mockUpdate.mockResolvedValue({
      id: 'e1',
      contributedAnonymizedAt: new Date(),
    });
    const result = await contributeAnonymized({ userId: 'u1', entryId: 'e1' });
    expect(result.contributedAnonymizedAt).toBeTruthy();
    const args = mockUpdate.mock.calls[0][0];
    expect(args.data.contributedAnonymizedAt).toBeInstanceOf(Date);
    // Does NOT change isPrivate (anonymized contribution is independent of friend share).
    expect(args.data.isPrivate).toBeUndefined();
  });

  it('rejects when entry belongs to another user', async () => {
    mockFindUnique.mockResolvedValue({ id: 'e1', userId: 'other' });
    await expect(
      contributeAnonymized({ userId: 'u1', entryId: 'e1' }),
    ).rejects.toThrow(/forbidden|not found/i);
  });
});
