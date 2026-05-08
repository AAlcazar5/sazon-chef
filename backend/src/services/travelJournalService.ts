// ROADMAP 4.0 G2.3 — "What I ate" travel journal service.
//
// Per-user log of dishes eaten while traveling. Default private. Opt-in
// to share with friends (F1) or contribute anonymized to global adjacency
// model. Each entry is high-signal training data when a cuisineTag is
// present — feeding into adjacency engine when shared/anonymized lands.

import { prisma } from '@/lib/prisma';

export const MAX_DISH_NAME_LEN = 200;
export const MAX_NOTE_LEN = 2000;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export interface RecordEntryInput {
  userId: string;
  dishName: string;
  citySlug?: string;
  cuisineTag?: string;
  photoUri?: string;
  note?: string;
  isPrivate?: boolean;
  occurredAt?: Date;
}

export interface TravelJournalEntry {
  id: string;
  userId: string;
  occurredAt: Date;
  citySlug: string | null;
  dishName: string;
  cuisineTag: string | null;
  photoUri: string | null;
  note: string | null;
  isPrivate: boolean;
  sharedWithFriendsAt: Date | null;
  contributedAnonymizedAt: Date | null;
}

function normLower(s: string | undefined | null): string | null {
  if (!s) return null;
  const v = s.trim().toLowerCase();
  return v ? v : null;
}

export async function recordEntry(input: RecordEntryInput): Promise<TravelJournalEntry> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  const dishName = (input.dishName ?? '').trim();
  if (!dishName) {
    throw new Error('dishName is required');
  }
  if (dishName.length > MAX_DISH_NAME_LEN) {
    throw new Error(
      `dishName exceeds max length ${MAX_DISH_NAME_LEN} (got ${dishName.length})`,
    );
  }
  const note = input.note?.trim() || null;
  if (note && note.length > MAX_NOTE_LEN) {
    throw new Error(
      `note exceeds max length ${MAX_NOTE_LEN} (got ${note.length})`,
    );
  }

  const data = {
    userId: input.userId,
    dishName,
    citySlug: normLower(input.citySlug),
    cuisineTag: normLower(input.cuisineTag),
    photoUri: input.photoUri?.trim() || null,
    note,
    isPrivate: input.isPrivate ?? true,
    occurredAt: input.occurredAt ?? new Date(),
  };

  return (await (prisma as any).travelJournalEntry.create({ data })) as TravelJournalEntry;
}

export interface GetEntriesInput {
  userId: string;
  since?: Date;
  limit?: number;
}

export async function getEntriesForUser(
  input: GetEntriesInput,
): Promise<TravelJournalEntry[]> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  const limit = Math.max(1, Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
  const where: any = { userId: input.userId };
  if (input.since) {
    where.occurredAt = { gte: input.since };
  }
  return (await (prisma as any).travelJournalEntry.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })) as TravelJournalEntry[];
}

interface MutationInput {
  userId: string;
  entryId: string;
}

async function loadOwnedEntry(input: MutationInput): Promise<TravelJournalEntry> {
  const row = (await (prisma as any).travelJournalEntry.findUnique({
    where: { id: input.entryId },
  })) as TravelJournalEntry | null;
  if (!row) {
    throw new Error('Entry not found');
  }
  if (row.userId !== input.userId) {
    throw new Error('Entry not found'); // never leak ownership
  }
  return row;
}

export async function shareWithFriends(input: MutationInput): Promise<TravelJournalEntry> {
  await loadOwnedEntry(input);
  return (await (prisma as any).travelJournalEntry.update({
    where: { id: input.entryId },
    data: {
      isPrivate: false,
      sharedWithFriendsAt: new Date(),
    },
  })) as TravelJournalEntry;
}

export async function contributeAnonymized(
  input: MutationInput,
): Promise<TravelJournalEntry> {
  await loadOwnedEntry(input);
  return (await (prisma as any).travelJournalEntry.update({
    where: { id: input.entryId },
    data: {
      contributedAnonymizedAt: new Date(),
    },
  })) as TravelJournalEntry;
}
