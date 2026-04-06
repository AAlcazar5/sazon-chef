// frontend/components/meal-plan/MealRequestResults.tsx
// Results view for "Find Me a Meal" — swipeable cards with macro match pills (10C)

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

interface MatchBreakdown {
  caloriesInRange: boolean;
  proteinMet: boolean;
  fatMet: boolean;
  carbsMet: boolean;
  fiberMet: boolean;
  cuisineMatch: boolean;
}

interface RecipeOption {
  recipe: any;
  matchScore: number;
  matchBreakdown: MatchBreakdown;
}

interface MealRequestResultsProps {
  options: RecipeOption[];
  totalMatches: number;
  generatedCount: number;
  onAddToPlan: (recipe: any) => void;
  onGenerateMore: () => void;
  onClose: () => void;
  targetDate: string;
  targetMealType: string;
  isDark: boolean;
}

function MacroPill({ label, met, isDark }: { label: string; met: boolean; isDark: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 100,
        backgroundColor: met
          ? isDark ? '#166534' : '#DCFCE7'
          : isDark ? '#2C2C2E' : '#F3F4F6',
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: met
            ? isDark ? '#86EFAC' : '#16A34A'
            : isDark ? '#9CA3AF' : '#6B7280',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function RecipeCard({ option, onAddToPlan, isDark }: { option: RecipeOption; onAddToPlan: (r: any) => void; isDark: boolean }) {
  const { recipe, matchScore, matchBreakdown } = option;
  const bgCard = isDark ? '#1C1C1E' : '#FFFFFF';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View
      style={[{ backgroundColor: bgCard, borderRadius: 20, padding: 16, marginBottom: 14 }, Shadows.MD]}
      accessibilityLabel={recipe.title}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>
            {recipe.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6',
                borderRadius: 100,
                paddingHorizontal: 8,
                paddingVertical: 3,
                marginRight: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>{recipe.cuisine}</Text>
            </View>
            <Text style={{ fontSize: 12, color: textSecondary }}>{recipe.cookTime} min</Text>
            <Text style={{ fontSize: 12, color: textSecondary, marginLeft: 8 }}>{recipe.difficulty}</Text>
          </View>
        </View>

        {/* Match score badge */}
        <View
          style={{
            backgroundColor: matchScore >= 80 ? (isDark ? '#166534' : '#DCFCE7') : isDark ? '#2C2C2E' : '#F3F4F6',
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 6,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '800',
              color: matchScore >= 80 ? (isDark ? '#86EFAC' : '#16A34A') : textSecondary,
            }}
          >
            {matchScore}
          </Text>
          <Text style={{ fontSize: 9, color: textSecondary, fontWeight: '600' }}>MATCH</Text>
        </View>
      </View>

      {/* Macro pills */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        <MacroPill label={`${recipe.protein}g protein`} met={matchBreakdown.proteinMet} isDark={isDark} />
        <MacroPill label={`${recipe.calories} cal`} met={matchBreakdown.caloriesInRange} isDark={isDark} />
        <MacroPill label={`${recipe.fat}g fat`} met={matchBreakdown.fatMet} isDark={isDark} />
        {recipe.fiber ? (
          <MacroPill label={`${recipe.fiber}g fiber`} met={matchBreakdown.fiberMet} isDark={isDark} />
        ) : null}
      </View>

      {/* Add to Plan button */}
      <HapticTouchableOpacity
        onPress={() => onAddToPlan(recipe)}
        style={{
          backgroundColor: Colors.accent.primary,
          borderRadius: 100,
          paddingVertical: 12,
          alignItems: 'center',
        }}
        accessibilityLabel={`Add ${recipe.title} to plan`}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Add to Plan</Text>
      </HapticTouchableOpacity>
    </View>
  );
}

export default function MealRequestResults({
  options,
  totalMatches,
  generatedCount,
  onAddToPlan,
  onGenerateMore,
  isDark,
}: MealRequestResultsProps) {
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View>
      {/* Stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: textPrimary }}>
          {options.length} {options.length === 1 ? 'option' : 'options'} found
        </Text>
        {generatedCount > 0 && (
          <View
            style={{
              backgroundColor: isDark ? '#1C1C2E' : '#EEF2FF',
              borderRadius: 100,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#A5B4FC' : '#4F46E5' }}>
              {generatedCount} generated by AI
            </Text>
          </View>
        )}
      </View>

      {/* Recipe cards */}
      {options.map((option, i) => (
        <RecipeCard key={option.recipe.id ?? i} option={option} onAddToPlan={onAddToPlan} isDark={isDark} />
      ))}

      {/* Generate more link */}
      <HapticTouchableOpacity
        onPress={onGenerateMore}
        style={{ alignItems: 'center', paddingVertical: 16 }}
        accessibilityLabel="Generate more options"
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: textSecondary }}>
          None of these — generate more
        </Text>
      </HapticTouchableOpacity>
    </View>
  );
}
