// Phase 4 (10Y-D) + Tier S: single source of truth for "what does this user's
// coach look like". Derives flags from the canonical useSubscription state.
//
// Tier S model labels:
//   - free → 'Haiku 4.5'
//   - premium chat → 'Sonnet 4.6 ✦ chat'
//   - premium deep_plan → 'Opus 4.7 ✦ deep plan'

export const FREE_DAILY_MESSAGE_CAP = 10;

export type CoachClientTier = 'free' | 'premium';
export type CoachClientIntent = 'chat' | 'deep_plan';

export interface CoachClientFlags {
  tier: CoachClientTier;
  canAttachPhotos: boolean;
  dailyMessageCap: number | null;
  hasMemory: boolean;
  hasWeeklyCheckin: boolean;
  modelLabel: string;
}

interface SubscriptionInput {
  tier: string;
  isPremium: boolean;
}

export function deriveCoachFlags(
  subscription: SubscriptionInput,
  intent: CoachClientIntent = 'chat',
): CoachClientFlags {
  const isPro = subscription.isPremium === true && subscription.tier === 'premium';
  if (isPro) {
    const modelLabel =
      intent === 'deep_plan'
        ? 'Opus 4.7 ✦ deep plan'
        : 'Sonnet 4.6 ✦ chat';
    return {
      tier: 'premium',
      canAttachPhotos: true,
      dailyMessageCap: null,
      hasMemory: true,
      hasWeeklyCheckin: true,
      modelLabel,
    };
  }
  return {
    tier: 'free',
    canAttachPhotos: false,
    dailyMessageCap: FREE_DAILY_MESSAGE_CAP,
    hasMemory: false,
    hasWeeklyCheckin: false,
    modelLabel: 'Haiku 4.5',
  };
}
