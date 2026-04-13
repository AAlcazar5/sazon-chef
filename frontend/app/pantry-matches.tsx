// frontend/app/pantry-matches.tsx
// 10H: "What can I make right now?" results screen.
// Lists recipes sorted by pantry match percentage, with missing-ingredient hints.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
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
  const surfaceBg = isDark ? DarkColors.background : Colors.background;
  const cardBg = isDark ? DarkColors.card : Colors.card;

  return (
    <View style={{ flex: 1, backgroundColor: surfaceBg }}>
      <Stack.Screen
        options={{
          title: maxMissing != null ? 'Just a couple items away' : 'Cook with what you have',
          headerStyle: { backgroundColor: surfaceBg },
          headerTintColor: textPrimary,
        }}
      />

      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={textSecondary} />
        </View>
      )}

      {!loading && error && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: textPrimary, fontSize: FontSize.md, textAlign: 'center' }}>
            Couldn't load matches — try again in a sec.
          </Text>
        </View>
      )}

      {!loading && !error && recipes.length === 0 && (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}
          testID="pantry-matches-empty"
        >
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🧊</Text>
          <Text
            style={{
              color: textPrimary,
              fontSize: FontSize.lg,
              fontWeight: FontWeight.bold,
              marginBottom: 6,
            }}
          >
            Nothing quite matches yet
          </Text>
          <Text style={{ color: textSecondary, fontSize: FontSize.sm, textAlign: 'center' }}>
            Add a few more items to your pantry and we'll find recipes that fit.
          </Text>
        </View>
      )}

      {!loading && !error && recipes.length > 0 && (
        <FlatList
          data={recipes}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
          testID="pantry-matches-list"
          renderItem={({ item }) => (
            <HapticTouchableOpacity
              testID={`pantry-match-item-${item.id}`}
              accessibilityLabel={`${item.title}, ${item.matchPercentage}% match`}
              onPress={() => router.push(`/recipe/${item.id}` as any)}
              style={[
                {
                  backgroundColor: cardBg,
                  borderRadius: BorderRadius.card,
                  padding: 14,
                  flexDirection: 'row',
                  gap: 12,
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
                    fontWeight: FontWeight.extrabold,
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
                    fontWeight: FontWeight.extrabold,
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
                      fontWeight: FontWeight.bold,
                    }}
                  >
                    You have everything
                  </Text>
                )}
              </View>
              <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.SM} color={textSecondary} />
            </HapticTouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
