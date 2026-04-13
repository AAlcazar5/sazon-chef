// frontend/components/home/PantryMatchCard.tsx
// 10H: "Cook with what you have" — pantry-based recipe matching widget for home.
//
// Fetches /recipes/pantry-match on mount. Shows a pastel peach pill with:
//   - total number of matches ("You can make 12 recipes right now")
//   - "Just need 1-2 more items" filter toggle
//   - tap → navigates to a dedicated list screen (/pantry-matches)
// Hides itself when pantry is empty so the home feed isn't cluttered.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';
import { pantryApi } from '../../lib/api';

export interface PantryMatchCardProps {
  onPress: (filter: { maxMissing?: number }) => void;
}

type State =
  | { phase: 'loading' }
  | { phase: 'hidden' } // pantry empty
  | { phase: 'ready'; totalMatches: number; nearMatches: number }
  | { phase: 'error' };

function PantryMatchCard({ onPress }: PantryMatchCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [justOneOrTwo, setJustOneOrTwo] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      setState({ phase: 'loading' });
      const res = await pantryApi.pantryMatch({ minMatch: 60, limit: 50 });
      const data = (res as any).data as {
        recipes: Array<{ missingIngredients: string[] }>;
        pantrySize: number;
      };
      if (!data || data.pantrySize === 0) {
        setState({ phase: 'hidden' });
        return;
      }
      const totalMatches = data.recipes.length;
      const nearMatches = data.recipes.filter(
        (r) => r.missingIngredients.length > 0 && r.missingIngredients.length <= 2,
      ).length;
      setState({ phase: 'ready', totalMatches, nearMatches });
    } catch {
      setState({ phase: 'error' });
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (state.phase === 'hidden') return null;

  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const tint = isDark ? PastelDark.peach : Pastel.peach;

  const handlePress = () => {
    onPress(justOneOrTwo ? { maxMissing: 2 } : {});
  };

  const containerStyle = [
    {
      backgroundColor: tint,
      borderRadius: BorderRadius.card,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
      padding: 16,
    },
    Shadows.SM,
  ];

  if (state.phase === 'loading') {
    return (
      <View style={containerStyle} testID="pantry-match-card-loading">
        <ActivityIndicator color={textSecondary} />
      </View>
    );
  }

  if (state.phase === 'error') {
    return null;
  }

  const displayCount = justOneOrTwo ? state.nearMatches : state.totalMatches;
  const emptyCopy = justOneOrTwo
    ? "Nothing's just a couple items away — try adding more to your pantry."
    : "Your pantry's a little light — add a few items to see matches.";

  return (
    <HapticTouchableOpacity
      testID="pantry-match-card"
      style={containerStyle}
      onPress={handlePress}
      accessibilityLabel={`Cook with what you have — ${displayCount} matches`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 28 }}>🧊</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: FontSize.md,
              fontWeight: FontWeight.extrabold,
              color: textPrimary,
              marginBottom: 2,
            }}
            testID="pantry-match-card-title"
          >
            {displayCount > 0
              ? `You can make ${displayCount} recipe${displayCount === 1 ? '' : 's'} right now`
              : 'Cook with what you have'}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: textSecondary }}>
            {displayCount > 0
              ? justOneOrTwo
                ? "You're 1–2 items away from these"
                : 'Based on your pantry — tap to see them'
              : emptyCopy}
          </Text>
        </View>
        <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.SM} color={textSecondary} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          marginTop: 12,
        }}
      >
        <HapticTouchableOpacity
          testID="pantry-match-toggle-all"
          onPress={(e?: any) => {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            setJustOneOrTwo(false);
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 100,
            backgroundColor: !justOneOrTwo ? (isDark ? '#0008' : '#FFFFFFAA') : 'transparent',
          }}
        >
          <Text style={{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: textPrimary }}>
            All matches
          </Text>
        </HapticTouchableOpacity>
        <HapticTouchableOpacity
          testID="pantry-match-toggle-near"
          onPress={(e?: any) => {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            setJustOneOrTwo(true);
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 100,
            backgroundColor: justOneOrTwo ? (isDark ? '#0008' : '#FFFFFFAA') : 'transparent',
          }}
        >
          <Text style={{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: textPrimary }}>
            Just 1–2 more items
          </Text>
        </HapticTouchableOpacity>
      </View>
    </HapticTouchableOpacity>
  );
}

export default PantryMatchCard;
