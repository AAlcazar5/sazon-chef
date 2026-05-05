// backend/src/services/friendsFeedService.ts
// ROADMAP 4.0 F1 — "Cook a friend's plate" feed.
//
// Surface ranks plates from followed users by:
//   - this user's pantry coverage of the friend's plate (50%)
//   - dietary compatibility (30%) — plates with banned ingredients filter out
//   - slot affinity overlap (20%) — friend's slot picks vs this user's
//
// MVP scope (post-launch polish noted in ROADMAP_4.0.md F1):
//   - Suggested follows / discoverability — TBD.
//   - Notifications when followed users share — TBD.
//   - Privacy controls (block, mute, request-to-follow) — TBD.

import { prisma } from '@/lib/prisma';

export interface FollowSummary {
  userId: string;
  followingCount: number;
  followerCount: number;
}

export async function follow(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself');
  }
  await prisma.userFollow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    create: { followerId, followingId },
    update: {},
  });
}

export async function unfollow(followerId: string, followingId: string): Promise<void> {
  await prisma.userFollow
    .delete({ where: { followerId_followingId: { followerId, followingId } } })
    .catch(() => undefined); // already-not-following is a no-op
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const row = await prisma.userFollow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  return !!row;
}

export async function getFollowing(userId: string): Promise<string[]> {
  const rows = await prisma.userFollow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  return rows.map(r => r.followingId);
}

export async function getFollowSummary(userId: string): Promise<FollowSummary> {
  const [followingCount, followerCount] = await Promise.all([
    prisma.userFollow.count({ where: { followerId: userId } }),
    prisma.userFollow.count({ where: { followingId: userId } }),
  ]);
  return { userId, followingCount, followerCount };
}

interface ComponentRef {
  slot: string;
  componentId: string;
  portionMultiplier?: number;
}

function parseComponentIds(json: string | null | undefined): ComponentRef[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c: unknown): c is ComponentRef =>
        !!c && typeof (c as ComponentRef).componentId === 'string' && typeof (c as ComponentRef).slot === 'string',
    );
  } catch {
    return [];
  }
}

export interface FeedScoreInputs {
  pantryComponentIds: Set<string>;
  bannedComponentIds: Set<string>;
  userSlotAffinity: Map<string, Set<string>>; // slot → set of preferred componentIds
  components: ComponentRef[];
}

export interface FeedScoreBreakdown {
  pantryCoverage: number;
  dietaryCompatibility: number;
  slotAffinityOverlap: number;
  composite: number;
}

const W_PANTRY = 0.5;
const W_DIETARY = 0.3;
const W_AFFINITY = 0.2;

export function scorePlate(inputs: FeedScoreInputs): FeedScoreBreakdown {
  const { components, pantryComponentIds, bannedComponentIds, userSlotAffinity } = inputs;
  if (components.length === 0) {
    return { pantryCoverage: 0, dietaryCompatibility: 1, slotAffinityOverlap: 0, composite: 0 };
  }

  const inPantry = components.filter(c => pantryComponentIds.has(c.componentId)).length;
  const pantryCoverage = inPantry / components.length;

  const banned = components.some(c => bannedComponentIds.has(c.componentId));
  const dietaryCompatibility = banned ? 0 : 1;

  let affinityHits = 0;
  for (const c of components) {
    const slotPrefs = userSlotAffinity.get(c.slot);
    if (slotPrefs && slotPrefs.has(c.componentId)) affinityHits += 1;
  }
  const slotAffinityOverlap = affinityHits / components.length;

  const composite =
    pantryCoverage * W_PANTRY +
    dietaryCompatibility * W_DIETARY +
    slotAffinityOverlap * W_AFFINITY;

  return { pantryCoverage, dietaryCompatibility, slotAffinityOverlap, composite };
}

export interface FeedItem {
  plateId: string;
  ownerId: string;
  ownerName: string | null;
  plateName: string | null;
  shareSlug: string | null;
  score: FeedScoreBreakdown;
  createdAt: string;
}

const FEED_LOOKBACK_DAYS = 30;
const FEED_LIMIT = 20;

export async function computeFriendsFeed(userId: string): Promise<FeedItem[]> {
  const followingIds = await getFollowing(userId);
  if (followingIds.length === 0) return [];

  const since = new Date(Date.now() - FEED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // Pull friends' plates that have been shared (i.e. have a plateShare row).
  // composedPlate doesn't directly have the share slug — we join via the
  // plateShare table.
  const shares = await prisma.plateShare.findMany({
    where: {
      createdBy: { in: followingIds },
      createdAt: { gte: since },
    },
    include: {
      plate: { select: { id: true, userId: true, componentIds: true, name: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: FEED_LIMIT * 2, // overfetch; some may filter out for dietary
  });

  if (shares.length === 0) return [];

  // Resolve scoring inputs in parallel.
  const [pantry, prefs, slotAff] = await Promise.all([
    prisma.pantryItem.findMany({ where: { userId }, select: { name: true } }),
    prisma.userPreferences.findUnique({
      where: { userId },
      include: { bannedIngredients: { select: { name: true } } },
    }),
    prisma.slotAffinity.findMany({ where: { userId } }),
  ]);

  // For pantry/banned we operate on names rather than componentIds because
  // MealComponent stores its name on the row. Resolve component names once.
  const componentIds = new Set<string>();
  for (const s of shares) {
    parseComponentIds((s.plate as { componentIds: string }).componentIds).forEach(c =>
      componentIds.add(c.componentId),
    );
  }

  const components = await prisma.mealComponent.findMany({
    where: { id: { in: Array.from(componentIds) } },
    select: { id: true, name: true, slot: true },
  });
  const componentNameById = new Map(components.map(c => [c.id, c.name.toLowerCase()]));

  const pantryNames = new Set(pantry.map(p => p.name.toLowerCase()));
  const bannedNames = new Set(
    (prefs?.bannedIngredients ?? []).map(b => b.name.toLowerCase()),
  );

  // Slot affinity: keep a set of preferred componentIds per slot. The
  // SlotAffinity model already stores per-(slot, componentId) weights;
  // we treat "weight > 0" as preferred.
  const userSlotAffinity = new Map<string, Set<string>>();
  for (const a of slotAff) {
    if ((a.score ?? 0) <= 0) continue;
    const set = userSlotAffinity.get(a.slot) ?? new Set();
    set.add(a.componentId);
    userSlotAffinity.set(a.slot, set);
  }

  // Translate componentId-keyed sets used by scorePlate.
  // For pantry/banned, we map componentId → name then check by name.
  const pantryComponentIds = new Set<string>();
  const bannedComponentIds = new Set<string>();
  for (const c of components) {
    const lower = c.name.toLowerCase();
    if (pantryNames.has(lower)) pantryComponentIds.add(c.id);
    if (bannedNames.has(lower)) bannedComponentIds.add(c.id);
  }

  // Owner display names, batched.
  const ownerIds = Array.from(new Set(shares.map(s => s.createdBy).filter(Boolean)));
  const owners = await prisma.user.findMany({
    where: { id: { in: ownerIds } },
    select: { id: true, name: true },
  });
  const ownerNameById = new Map(owners.map(o => [o.id, o.name ?? null]));

  const items: FeedItem[] = [];
  for (const share of shares) {
    const plate = share.plate as { id: string; userId: string; componentIds: string; name: string | null; createdAt: Date };
    const refs = parseComponentIds(plate.componentIds);
    const score = scorePlate({
      components: refs,
      pantryComponentIds,
      bannedComponentIds,
      userSlotAffinity,
    });
    if (score.dietaryCompatibility === 0) continue; // hide plates with banned items
    items.push({
      plateId: plate.id,
      ownerId: plate.userId,
      ownerName: ownerNameById.get(plate.userId) ?? null,
      plateName: plate.name,
      shareSlug: share.slug,
      score,
      createdAt: plate.createdAt.toISOString(),
    });
    void componentNameById; // silence unused-when-empty
  }

  items.sort((a, b) => b.score.composite - a.score.composite);
  return items.slice(0, FEED_LIMIT);
}

export const __forTest = {
  parseComponentIds,
  W_PANTRY,
  W_DIETARY,
  W_AFFINITY,
  FEED_LOOKBACK_DAYS,
  FEED_LIMIT,
};
