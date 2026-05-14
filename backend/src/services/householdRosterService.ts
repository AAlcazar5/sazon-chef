// backend/src/services/householdRosterService.ts
// Group 10X Phase 7 — Household roster CRUD.
//
// One user owns N household members. Members carry per-person dietary flags,
// pickiness, age band, and a list of components they outright reject. The
// composer's "Diverge from a shared base" template uses this roster to pick
// per-plate divergent slots that adapt to *this* family member.

import { prisma } from '../lib/prisma';
import { serializeJsonColumnSafe } from '../utils/jsonColumns';

export type AgeBand = 'toddler' | 'kid' | 'teen' | 'adult' | 'elder';

export interface HouseholdMemberInput {
  displayName: string;
  ageBand: AgeBand;
  pickinessLevel?: number;
  dietaryFlags?: string[];
  bannedComponentIds?: string[];
}

export interface HouseholdMemberRow {
  id: string;
  userId: string;
  displayName: string;
  ageBand: AgeBand;
  pickinessLevel: number;
  dietaryFlags: string[];
  bannedComponentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const VALID_AGE_BANDS: AgeBand[] = ['toddler', 'kid', 'teen', 'adult', 'elder'];

const validateMember = (input: HouseholdMemberInput): void => {
  if (!input.displayName || input.displayName.length > 64) {
    throw new Error('displayName is required and must be ≤64 chars');
  }
  if (!VALID_AGE_BANDS.includes(input.ageBand)) {
    throw new Error(`ageBand must be one of: ${VALID_AGE_BANDS.join(', ')}`);
  }
  if (input.pickinessLevel !== undefined && (input.pickinessLevel < 0 || input.pickinessLevel > 4)) {
    throw new Error('pickinessLevel must be between 0 and 4');
  }
  if (input.dietaryFlags && input.dietaryFlags.length > 20) {
    throw new Error('dietaryFlags max length is 20');
  }
  if (input.bannedComponentIds && input.bannedComponentIds.length > 100) {
    throw new Error('bannedComponentIds max length is 100');
  }
};

const safeJsonArray = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
};

const toRow = (raw: {
  id: string;
  userId: string;
  displayName: string;
  ageBand: string;
  pickinessLevel: number;
  dietaryFlags: string;
  bannedComponentIds: string;
  createdAt: Date;
  updatedAt: Date;
}): HouseholdMemberRow => ({
  id: raw.id,
  userId: raw.userId,
  displayName: raw.displayName,
  ageBand: raw.ageBand as AgeBand,
  pickinessLevel: raw.pickinessLevel,
  dietaryFlags: safeJsonArray(raw.dietaryFlags),
  bannedComponentIds: safeJsonArray(raw.bannedComponentIds),
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

export const listHouseholdMembers = async (userId: string): Promise<HouseholdMemberRow[]> => {
  const rows = await prisma.householdMember.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toRow);
};

export const createHouseholdMember = async (
  userId: string,
  input: HouseholdMemberInput,
): Promise<HouseholdMemberRow> => {
  validateMember(input);
  const row = await prisma.householdMember.create({
    data: {
      userId,
      displayName: input.displayName,
      ageBand: input.ageBand,
      pickinessLevel: input.pickinessLevel ?? 0,
      dietaryFlags: serializeJsonColumnSafe('dietaryFlags', input.dietaryFlags ?? []),
      bannedComponentIds: serializeJsonColumnSafe('bannedComponentIds', input.bannedComponentIds ?? []),
    },
  });
  return toRow(row);
};

export const updateHouseholdMember = async (
  userId: string,
  memberId: string,
  input: Partial<HouseholdMemberInput>,
): Promise<HouseholdMemberRow> => {
  // IDOR guard — must own the member
  const existing = await prisma.householdMember.findUnique({ where: { id: memberId } });
  if (!existing || existing.userId !== userId) {
    throw new Error('Member not found or forbidden');
  }
  const merged: HouseholdMemberInput = {
    displayName: input.displayName ?? existing.displayName,
    ageBand: (input.ageBand ?? existing.ageBand) as AgeBand,
    pickinessLevel: input.pickinessLevel ?? existing.pickinessLevel,
    dietaryFlags: input.dietaryFlags ?? safeJsonArray(existing.dietaryFlags),
    bannedComponentIds: input.bannedComponentIds ?? safeJsonArray(existing.bannedComponentIds),
  };
  validateMember(merged);
  const row = await prisma.householdMember.update({
    where: { id: memberId },
    data: {
      displayName: merged.displayName,
      ageBand: merged.ageBand,
      pickinessLevel: merged.pickinessLevel,
      dietaryFlags: serializeJsonColumnSafe('dietaryFlags', merged.dietaryFlags ?? []),
      bannedComponentIds: serializeJsonColumnSafe('bannedComponentIds', merged.bannedComponentIds ?? []),
    },
  });
  return toRow(row);
};

export const deleteHouseholdMember = async (
  userId: string,
  memberId: string,
): Promise<void> => {
  const existing = await prisma.householdMember.findUnique({ where: { id: memberId } });
  if (!existing || existing.userId !== userId) {
    throw new Error('Member not found or forbidden');
  }
  await prisma.householdMember.delete({ where: { id: memberId } });
};
