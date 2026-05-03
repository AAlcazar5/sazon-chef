// Phase 4 (10Y-D): single source of truth for "what does this user's coach
// look like". Derives flags from the canonical useSubscription state.

export const FREE_DAILY_MESSAGE_CAP = 10;

export type CoachClientTier = 'free' | 'premium';

export interface CoachClientFlags {
  tier: CoachClientTier;
  canAttachPhotos: boolean;
  dailyMessageCap: number | null;
  hasMemory: boolean;
  hasWeeklyCheckin: boolean;
  modelLabel: 'Sonnet' | 'Opus';
}

interface SubscriptionInput {
  tier: string;
  isPremium: boolean;
}

export function deriveCoachFlags(subscription: SubscriptionInput): CoachClientFlags {
  const isPro = subscription.isPremium === true && subscription.tier === 'premium';
  if (isPro) {
    return {
      tier: 'premium',
      canAttachPhotos: true,
      dailyMessageCap: null,
      hasMemory: true,
      hasWeeklyCheckin: true,
      modelLabel: 'Opus',
    };
  }
  return {
    tier: 'free',
    canAttachPhotos: false,
    dailyMessageCap: FREE_DAILY_MESSAGE_CAP,
    hasMemory: false,
    hasWeeklyCheckin: false,
    modelLabel: 'Sonnet',
  };
}
