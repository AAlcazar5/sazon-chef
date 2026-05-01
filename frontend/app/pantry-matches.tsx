// frontend/app/pantry-matches.tsx
// 10H: "What can I make right now?" results screen.
// Lists recipes sorted by pantry match percentage, with missing-ingredient hints.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import ScreenGradient from '../components/ui/ScreenGradient';
import LoadingState from '../components/ui/LoadingState';
import AnimatedEmptyState from '../components/ui/AnimatedEmptyState';
import Icon from '../components/ui/Icon';
import { Icons, IconSizes } from '../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark } from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import { BorderRadius, Spacing } from '../constants/Spacing';
import { Shadows } from '../constants/Shadows';
import { useTheme } from '../contexts/ThemeContext';
import { pantryApi } from '../lib/api';

interface MatchRecipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  cookTime: number;
  imageUrl: string | null;
  calories: number;
  protein: number;
  matchPercentage: number;
  missingIngredients: string[];
  canSubstitute: boolean;
}

export default function PantryMatchesScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const params = useLocalSearchParams<{ maxMissing?: string }>();
  const maxMissing = params.maxMissing ? Number(params.maxMissing) : undefined;

  const [recipes, setRecipes] = useState<MatchRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await pantryApi.pantryMatch({
        minMatch: maxMissing != null ? 40 : 60,
        maxMissing,
        limit: 50,
      });
      setRecipes(((res as any).data.recipes as MatchRecipe[]) || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [maxMissing]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const cardBg = isDark ? DarkColors.card : Colors.card;

  const title = maxMissing != null ? 'Just a Couple Items Away' : 'Cook With What You Have';

  return (
    <ScreenGradient>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
          }}
        >
          <HapticTouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8 }}
            accessibilityLabel="Go back to Home"
          >
            <Icon name={Icons.CHEVRON_BACK} size={IconSizes.MD} color={textPrimary} />
          </HapticTouchableOpacity>
          <Text
            style={{
              flex: 1,
              fontSize: FontSize.xl,
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              color: textPrimary,
              marginLeft: 4,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {loading && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <LoadingState message="Finding matches..." expression="thinking" />
          </View>
        )}

        {!loading && error && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <AnimatedEmptyState
              useMascot
              mascotExpression="confused"
              mascotSize="medium"
              title="Something Went Wrong"
              description="Couldn't load matches — try again in a sec."
              actionLabel="Try Again"
              onAction={fetchMatches}
            />
          </View>
        )}

        {!loading && !error && recipes.length === 0 && (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}
            testID="pantry-matches-empty"
          >
            <AnimatedEmptyState
              useMascot
              mascotExpression="curious"
              mascotSize="medium"
              title="Nothing Quite Matches Yet"
              description="Add a few more items to your pantry and we'll find recipes that fit."
              actionLabel="Go Back"
              onAction={() => router.back()}
            />
          </View>
        )}

        {!loading && !error && recipes.length > 0 && (
          <FlatList
            data={recipes}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.sm }}
            testID="pantry-matches-list"
            renderItem={({ item }) => (
              <HapticTouchableOpacity
                testID={`pantry-match-item-${item.id}`}
                accessibilityLabel={`${item.title}, ${item.matchPercentage}% match`}
                onPress={() => router.push(`/modal?id=${item.id}&source=pantry` as any)}
                style={[
                  {
                    backgroundColor: cardBg,
                    borderRadius: BorderRadius.card,
                    padding: 14,
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'center',
                  },
                  Shadows.SM,
                ]}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: BorderRadius.card,
                    backgroundColor: isDark ? PastelDark.peach : Pastel.peach,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: FontSize.md,
                      fontFamily: 'PlusJakartaSans_800ExtraBold',
                      color: textPrimary,
                    }}
                  >
                    {item.matchPercentage}%
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FontSize.md,
                      fontFamily: 'PlusJakartaSans_800ExtraBold',
                      color: textPrimary,
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{ fontSize: FontSize.xs, color: textSecondary, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.cuisine} · {item.cookTime}m · {item.calories} cal
                  </Text>
                  {item.missingIngredients.length > 0 ? (
                    <Text
                      style={{ fontSize: FontSize.xs, color: textSecondary, marginTop: 4 }}
                      numberOfLines={1}
                    >
                      Need: {item.missingIngredients.slice(0, 2).join(', ')}
                      {item.missingIngredients.length > 2
                        ? ` +${item.missingIngredients.length - 2}`
                        : ''}
                    </Text>
                  ) : (
                    <Text
                      style={{
                        fontSize: FontSize.xs,
                        color: isDark ? DarkColors.success : Colors.success,
                        marginTop: 4,
                        fontFamily: 'PlusJakartaSans_700Bold',
                      }}
                    >
                      You Have Everything
                    </Text>
                  )}
                </View>
                <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.SM} color={textSecondary} />
              </HapticTouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}
