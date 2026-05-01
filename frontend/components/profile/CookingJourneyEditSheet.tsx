// Group 10I: Cooking Journey edit sheet — lets users seed cuisines they already
// know how to cook and edit their skill level. Tapped from CookingJourneyCard.

import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import BottomSheet from '../ui/BottomSheet';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import { CATEGORY_COLORS } from '../../constants/CategoryColors';
import type { SkillLevel } from '../../hooks/useCookingJourney';

const CUISINE_OPTIONS: ReadonlyArray<string> = [
  'Italian',
  'Mexican',
  'Japanese',
  'Chinese',
  'Indian',
  'Thai',
  'Korean',
  'Mediterranean',
  'American',
  'French',
  'Greek',
  'Vietnamese',
  'Ethiopian',
  'Caribbean',
];

const SKILL_OPTIONS: ReadonlyArray<{ value: SkillLevel; label: string; description: string }> = [
  { value: 'beginner', label: 'Beginner', description: 'Learning the basics' },
  { value: 'home_cook', label: 'Home Cook', description: 'Comfortable with weeknight meals' },
  { value: 'confident', label: 'Confident', description: 'Improvise without a recipe' },
  { value: 'chef', label: 'Chef', description: 'Complex techniques feel easy' },
];

interface CookingJourneyEditSheetProps {
  visible: boolean;
  onClose: () => void;
  initialCuisines: ReadonlyArray<string>;
  initialSkillLevel: SkillLevel;
  onSave: (data: { seededCuisines: string[]; cookingSkillLevel: SkillLevel }) => Promise<void>;
  testID?: string;
}

export default function CookingJourneyEditSheet({
  visible,
  onClose,
  initialCuisines,
  initialSkillLevel,
  onSave,
  testID,
}: CookingJourneyEditSheetProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(new Set(initialCuisines));
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initialSkillLevel);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedCuisines(new Set(initialCuisines));
      setSkillLevel(initialSkillLevel);
    }
  }, [visible, initialCuisines, initialSkillLevel]);

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) => {
      const next = new Set(prev);
      if (next.has(cuisine)) next.delete(cuisine);
      else next.add(cuisine);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        seededCuisines: [...selectedCuisines],
        cookingSkillLevel: skillLevel,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit Your Journey" scrollable>
      <View testID={testID} style={{ padding: Spacing.md }}>
        <Text style={{ fontSize: 14, color: textSecondary, marginBottom: Spacing.md }}>
          Seed your flag grid with cuisines you already know how to cook. This won&apos;t change
          your recipe recommendations — it just makes your journey reflect reality.
        </Text>

        <Text
          style={{
            fontSize: 13,
            fontFamily: 'PlusJakartaSans_600SemiBold',
            color: textPrimary,
            marginBottom: Spacing.sm,
          }}
        >
          Cuisines I already cook
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg }}>
          {CUISINE_OPTIONS.map((cuisine) => {
            const selected = selectedCuisines.has(cuisine);
            const colorConfig = CATEGORY_COLORS[cuisine];
            const bg = selected
              ? isDark
                ? colorConfig?.bgDark ?? '#334155'
                : colorConfig?.bg ?? '#E2E8F0'
              : isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)';
            const fg = selected
              ? isDark
                ? colorConfig?.textDark ?? '#F8FAFC'
                : colorConfig?.text ?? '#334155'
              : textSecondary;
            return (
              <HapticTouchableOpacity
                key={cuisine}
                testID={`edit-cuisine-${cuisine}`}
                accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${cuisine}`}
                accessibilityState={{ selected }}
                onPress={() => toggleCuisine(cuisine)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 100,
                  backgroundColor: bg,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: selected ? '600' : '500', color: fg }}>
                  {colorConfig?.emoji ? `${colorConfig.emoji} ` : ''}
                  {cuisine}
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            fontSize: 13,
            fontFamily: 'PlusJakartaSans_600SemiBold',
            color: textPrimary,
            marginBottom: Spacing.sm,
          }}
        >
          Skill level
        </Text>
        <View style={{ gap: 8, marginBottom: Spacing.lg }}>
          {SKILL_OPTIONS.map((option) => {
            const selected = skillLevel === option.value;
            return (
              <HapticTouchableOpacity
                key={option.value}
                testID={`edit-skill-${option.value}`}
                accessibilityLabel={`Set skill level to ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => setSkillLevel(option.value)}
                style={{
                  padding: Spacing.md,
                  borderRadius: BorderRadius.card,
                  backgroundColor: selected
                    ? isDark
                      ? 'rgba(249,115,22,0.18)'
                      : 'rgba(249,115,22,0.10)'
                    : isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.03)',
                }}
              >
                <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: textPrimary }}>
                  {selected ? '● ' : '○ '}
                  {option.label}
                </Text>
                <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                  {option.description}
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </View>

        <HapticTouchableOpacity
          testID="edit-save"
          accessibilityLabel="Save cooking journey"
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: '#F97316',
            borderRadius: 100,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' }}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </HapticTouchableOpacity>
        <ScrollView style={{ height: 0 }} />
      </View>
    </BottomSheet>
  );
}
