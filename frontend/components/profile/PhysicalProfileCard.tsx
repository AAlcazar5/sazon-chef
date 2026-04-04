// frontend/components/profile/PhysicalProfileCard.tsx
// Physical profile display card with pastel-tinted stat rows

import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useState } from 'react';
import { router } from 'expo-router';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { FontSize, FontWeight } from '../../constants/Typography';
import { useTheme } from '../../contexts/ThemeContext';
import HelpTooltip from '../ui/HelpTooltip';

interface PhysicalProfileCardProps {
  physicalProfile: any | null;
}

const STAT_ROWS = [
  { key: 'gender', label: 'Gender', tint: Pastel.lavender, tintDark: PastelDark.lavender, emoji: '👤' },
  { key: 'age', label: 'Age', tint: Pastel.sky, tintDark: PastelDark.sky, emoji: '🎂' },
  { key: 'height', label: 'Height', tint: Pastel.sage, tintDark: PastelDark.sage, emoji: '📏' },
  { key: 'weight', label: 'Weight', tint: Pastel.peach, tintDark: PastelDark.peach, emoji: '⚖️' },
  { key: 'activityLevel', label: 'Activity', tint: Pastel.golden, tintDark: PastelDark.golden, emoji: '🏃' },
  { key: 'fitnessGoal', label: 'Goal', tint: Pastel.blush, tintDark: PastelDark.blush, emoji: '🎯' },
] as const;

function formatValue(key: string, profile: any): string | null {
  switch (key) {
    case 'gender':
      return profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null;
    case 'age':
      return profile.age ? `${profile.age} years` : null;
    case 'height': {
      if (!profile.heightCm) return null;
      const totalInches = profile.heightCm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}'${inches}" (${profile.heightCm} cm)`;
    }
    case 'weight':
      return profile.weightKg
        ? `${Math.round(profile.weightKg * 2.20462 * 10) / 10} lbs (${profile.weightKg} kg)`
        : null;
    case 'activityLevel':
      return profile.activityLevel ? profile.activityLevel.replace('_', ' ') : null;
    case 'fitnessGoal':
      return profile.fitnessGoal ? profile.fitnessGoal.replace('_', ' ') : null;
    default:
      return null;
  }
}

export default function PhysicalProfileCard({ physicalProfile }: PhysicalProfileCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <View style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        },
        Shadows.MD as any,
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[
              styles.headerIcon,
              { backgroundColor: isDark ? PastelDark.blush : Pastel.blush },
            ]}>
              <Icon name={Icons.PHYSICAL_PROFILE} size={IconSizes.MD} color={isDark ? '#F06292' : '#E91E63'} accessibilityLabel="Physical profile" />
            </View>
            <Text style={[styles.headerTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
              Physical Profile
            </Text>
            <HapticTouchableOpacity
              onPress={() => setShowHelp(true)}
              style={{ padding: 4 }}
              hapticStyle="light"
            >
              <Icon name={Icons.INFO_OUTLINE} size={IconSizes.SM} color={isDark ? '#6B7280' : '#9CA3AF'} accessibilityLabel="Help" />
            </HapticTouchableOpacity>
          </View>
          <HapticTouchableOpacity onPress={() => router.push('/edit-physical-profile')}>
            <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Edit" />
          </HapticTouchableOpacity>
        </View>

        {physicalProfile ? (
          <View style={styles.statGrid}>
            {STAT_ROWS.map((row) => {
              const value = formatValue(row.key, physicalProfile);
              if (!value) return null;
              return (
                <View
                  key={row.key}
                  style={[
                    styles.statRow,
                    { backgroundColor: isDark ? row.tintDark : row.tint },
                  ]}
                >
                  <Text style={styles.statEmoji}>{row.emoji}</Text>
                  <Text style={[styles.statLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                    {row.label}
                  </Text>
                  <Text
                    style={[styles.statValue, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {value}
                  </Text>
                </View>
              );
            })}

            {/* Target weight */}
            {physicalProfile.targetWeightKg && (
              <View
                style={[
                  styles.statRow,
                  { backgroundColor: isDark ? PastelDark.sage : Pastel.sage },
                ]}
              >
                <Text style={styles.statEmoji}>🎯</Text>
                <Text style={[styles.statLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                  Target
                </Text>
                <Text style={[styles.statValue, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
                  {Math.round(physicalProfile.targetWeightKg * 2.20462 * 10) / 10} lbs ({physicalProfile.targetWeightKg} kg)
                </Text>
              </View>
            )}

            {/* BMR / TDEE — highlight row */}
            {(physicalProfile.bmr || physicalProfile.tdee) && (
              <View style={[
                styles.metricsRow,
                { backgroundColor: isDark ? 'rgba(255,139,65,0.10)' : Pastel.orange },
              ]}>
                {physicalProfile.bmr && (
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                      BMR
                    </Text>
                    <Text style={[styles.metricValue, { color: isDark ? '#FFB74D' : '#E65100' }]}>
                      {Math.round(physicalProfile.bmr)}
                    </Text>
                    <Text style={[styles.metricUnit, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}>
                      cal/day
                    </Text>
                  </View>
                )}
                {physicalProfile.tdee && (
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                      TDEE
                    </Text>
                    <Text style={[styles.metricValue, { color: isDark ? '#FFB74D' : '#E65100' }]}>
                      {Math.round(physicalProfile.tdee)}
                    </Text>
                    <Text style={[styles.metricUnit, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}>
                      cal/day
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <HapticTouchableOpacity
            onPress={() => router.push('/edit-physical-profile')}
            style={[
              styles.emptyState,
              { backgroundColor: isDark ? PastelDark.peach : Pastel.peach },
            ]}
            accessibilityLabel="Set up your physical profile"
          >
            <View style={styles.emptyRow}>
              <Text style={styles.emptyEmoji}>📐</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.emptyTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
                  Set up your physical profile
                </Text>
                <Text style={[styles.emptyDesc, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                  Get personalized macro calculations based on your body metrics
                </Text>
              </View>
              <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.SM} color={isDark ? DarkColors.text.tertiary : Colors.text.tertiary} accessibilityLabel="" />
            </View>
          </HapticTouchableOpacity>
        )}
      </View>

      <HelpTooltip
        visible={showHelp}
        title="About Physical Profile"
        message="Your physical profile helps us calculate your personalized daily calorie and macro nutrient needs using scientific formulas (BMR/TDEE). This includes your age, gender, height, weight, activity level, and fitness goals. The more accurate your information, the better we can personalize your recipe recommendations!"
        type="guide"
        onDismiss={() => setShowHelp(false)}
        actionLabel="Set Up Profile"
        onAction={() => {
          router.push('/edit-physical-profile');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  statGrid: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statEmoji: {
    fontSize: 16,
    marginRight: 10,
    width: 22,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    width: 64,
  },
  statValue: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textAlign: 'right',
    textTransform: 'capitalize',
  },
  metricsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    gap: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
  },
  metricUnit: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  emptyState: {
    borderRadius: 14,
    padding: 14,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  emptyDesc: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
});
