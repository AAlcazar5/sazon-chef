// Group 10S: Kitchen IQ — profile entry card showing unlock count + 3 most-recent previews.

import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import useKitchenIQProgress from '../../hooks/useKitchenIQProgress';
import { KITCHEN_IQ_CARDS, KitchenIQCard } from '../../lib/kitchenIQ/cards';

interface KitchenIQSectionProps {
  testID?: string;
}

const PREVIEW_LIMIT = 3;

function pickPreviewCards(unlockedIds: string[]): KitchenIQCard[] {
  const recent = unlockedIds.slice(-PREVIEW_LIMIT).reverse();
  return recent
    .map((id) => KITCHEN_IQ_CARDS.find((card) => card.id === id))
    .filter((card): card is KitchenIQCard => Boolean(card));
}

export default function KitchenIQSection({ testID }: KitchenIQSectionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { totalCards, unlockedCount, unlockedIds, loading, error } = useKitchenIQProgress();

  if (loading || error || unlockedCount === 0) {
    return null;
  }

  const cardBg = isDark ? '#1F2937' : '#FAF7F4';
  const tint = isDark ? PastelDark.lavender : Pastel.lavender;
  const primaryText = isDark ? DarkColors.text.primary : Colors.text.primary;
  const secondaryText = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const previews = pickPreviewCards(unlockedIds);
  const progressLabel = `${unlockedCount} of ${totalCards} unlocked`;

  const goToHub = () => router.push('/kitchen-iq' as any);

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: cardBg,
        borderRadius: BorderRadius.card,
        padding: Spacing.lg,
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.sm,
        ...Shadows.MD,
      }}
    >
      <HapticTouchableOpacity
        testID="kitchen-iq-section-header"
        accessibilityLabel={`Kitchen IQ, ${progressLabel}. Tap to browse all cards.`}
        accessibilityRole="button"
        onPress={goToHub}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: tint,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: Spacing.sm,
          }}
        >
          <Text style={{ fontSize: 18 }}>🧠</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: 'PlusJakartaSans_600SemiBold',
              color: primaryText,
            }}
            accessibilityRole="header"
          >
            Kitchen IQ
          </Text>
          <Text style={{ fontSize: 13, marginTop: 2, color: secondaryText }}>
            {progressLabel}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: secondaryText }}>Browse ›</Text>
      </HapticTouchableOpacity>

      {previews.length > 0 && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {previews.map((card) => (
            <HapticTouchableOpacity
              key={card.id}
              testID={`kitchen-iq-thumb-${card.id}`}
              accessibilityLabel={`Kitchen IQ card: ${card.title}`}
              accessibilityRole="button"
              onPress={goToHub}
              style={{
                flex: 1,
                padding: Spacing.md,
                borderRadius: BorderRadius.card,
                backgroundColor: tint,
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 6 }}>{card.heroEmoji}</Text>
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 12,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  color: primaryText,
                }}
              >
                {card.title}
              </Text>
            </HapticTouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
