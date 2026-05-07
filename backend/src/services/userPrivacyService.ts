// ROADMAP 4.0 N8.2 — Central privacy opt-out for cross-user data flows.
//
// One toggle (`UserPreferences.privacyShareOptIn`) governs three flows:
//   - IG1.1 cross-user co-purchase aggregation (the user's purchase events
//     contribute to the global co-purchase matrix)
//   - HX2.3 cohort overlay (friend names visible on the hero)
//   - F1 friends feed (the user's cooks appear in friends' feeds)
//
// Default opt-IN with a k-anonymity ≥ 30 floor for aggregations; opt-out
// hides all three. A single source of truth — no per-feature toggles
// fragmenting the surface.
//
// Cross-tier dovetail: IG3 / IG6 cohort lookups + cohortInsightsService
// (N7.3) MUST honor this flag before reading or aggregating cross-user data.

import { prisma } from '../lib/prisma';

export interface PrivacySettings {
  /** True iff the user has opted in to cross-user data flows. */
  shareOptIn: boolean;
  /** True iff the user has opted in to social features (friends). */
  socialOptIn: boolean;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  shareOptIn: true,
  socialOptIn: false,
};

interface PrefsRow {
  privacyShareOptIn: boolean | null;
  socialOptIn: boolean | null;
}

/** Read both privacy + social opt-in for a user. Defaults applied for missing rows. */
export async function getPrivacySettings(
  userId: string,
): Promise<PrivacySettings> {
  if (!userId) return DEFAULT_SETTINGS;
  const prefs = (await (prisma as any).userPreferences.findUnique({
    where: { userId },
    select: { privacyShareOptIn: true, socialOptIn: true },
  })) as PrefsRow | null;
  if (!prefs) return DEFAULT_SETTINGS;
  return {
    shareOptIn: prefs.privacyShareOptIn ?? DEFAULT_SETTINGS.shareOptIn,
    socialOptIn: prefs.socialOptIn ?? DEFAULT_SETTINGS.socialOptIn,
  };
}

export interface UpdatePrivacySettingsInput {
  userId: string;
  shareOptIn?: boolean;
  socialOptIn?: boolean;
}

/** Update either or both flags. Upserts the UserPreferences row. */
export async function updatePrivacySettings(
  input: UpdatePrivacySettingsInput,
): Promise<PrivacySettings> {
  if (!input.userId) throw new Error('updatePrivacySettings: userId required');
  const data: Record<string, unknown> = {};
  if (input.shareOptIn !== undefined) data.privacyShareOptIn = input.shareOptIn;
  if (input.socialOptIn !== undefined) data.socialOptIn = input.socialOptIn;
  await (prisma as any).userPreferences.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      cookTimePreference: 30,
      ...data,
    },
    update: data,
  });
  return getPrivacySettings(input.userId);
}

/**
 * Convenience guard for cross-user data readers. Use at the call site:
 *   if (!(await canShareCrossUserData(userId))) return [];
 */
export async function canShareCrossUserData(userId: string): Promise<boolean> {
  return (await getPrivacySettings(userId)).shareOptIn;
}

/** Convenience guard for friend-cohort readers. */
export async function canSurfaceFriends(userId: string): Promise<boolean> {
  return (await getPrivacySettings(userId)).socialOptIn;
}
