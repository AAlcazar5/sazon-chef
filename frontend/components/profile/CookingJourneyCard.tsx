// Group 10I: Cooking Journey — profile card showing cooking stats, streaks, cuisines explored,
// and a skill-up nudge banner when the user is ready to level up.

import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import { useTheme } from '../../contexts/ThemeContext';
import { useCookingJourney, SkillLevel } from '../../hooks/useCookingJourney';
import CookingJourneyEditSheet from './CookingJourneyEditSheet';

const SKILL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  home_cook: 'Home Cook',
  confident: 'Confident',
  chef: 'Chef',
};

const TREND_LABEL: Record<string, string> = {
  leveling_up: '↑ Leveling up',
  steady: '→ Steady',
  leveling_down: '↓ Taking it easy',
  insufficient_data: 'Keep cooking',
};

interface StatTileProps {
  value: string | number;
  label: string;
  isDark: boolean;
  tint: string;
  testID?: string;
}

function StatTile({ value, label, isDark, tint, testID }: StatTileProps) {
  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        minWidth: 96,
        padding: Spacing.md,
        borderRadius: BorderRadius.card,
        backgroundColor: tint,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: isDark ? DarkColors.text.primary : Colors.text.primary,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 12,
          marginTop: 4,
          color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

interface CookingJourneyCardProps {
  testID?: string;
}

export default function CookingJourneyCard({ testID }: CookingJourneyCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { stats, progress, loading, acceptLevelUp, seedJourney } = useCookingJourney();
  const [editVisible, setEditVisible] = useState(false);

  const cardBg = isDark ? '#1F2937' : '#FFFFFF';

  const pastelSage = isDark ? '#1F3A2E' : '#E8F4EA';
  const pastelPeach = isDark ? '#3A2A1F' : '#FFE8D6';
  const pastelLavender = isDark ? '#2A2A3A' : '#EDE7F6';
  const pastelSky = isDark ? '#1F2F3A' : '#E0F2FE';

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
        testID="cooking-journey-edit-trigger"
        accessibilityLabel="Edit your cooking journey"
        accessibilityRole="button"
        onPress={() => setEditVisible(true)}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: pastelSage,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: Spacing.sm,
          }}
        >
          <Text style={{ fontSize: 18 }}>📈</Text>
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: '600',
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          }}
          accessibilityRole="header"
        >
          Your Cooking Journey
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
          }}
        >
          Edit ›
        </Text>
      </HapticTouchableOpacity>

      {loading && (
        <Text
          testID="cooking-journey-loading"
          style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}
        >
          Loading your stats…
        </Text>
      )}

      {!loading && stats && (
        <>
          {progress?.readyToLevelUp && progress.nextLevel && (
            <HapticTouchableOpacity
              testID="skill-levelup-banner"
              accessibilityLabel={`Level up to ${SKILL_LABEL[progress.nextLevel]}`}
              onPress={() => acceptLevelUp(progress.nextLevel as SkillLevel)}
              style={{
                padding: Spacing.md,
                borderRadius: BorderRadius.card,
                backgroundColor: pastelPeach,
                marginBottom: Spacing.md,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isDark ? DarkColors.text.primary : Colors.text.primary,
                }}
              >
                ✨ Ready to level up to {SKILL_LABEL[progress.nextLevel]}?
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
                }}
              >
                {progress.reason} Tap to accept.
              </Text>
            </HapticTouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
            <StatTile
              testID="stat-cooked-month"
              value={stats.recipesCookedThisMonth}
              label="Cooked this month"
              isDark={isDark}
              tint={pastelSage}
            />
            <StatTile
              testID="stat-cooked-total"
              value={stats.recipesCookedAllTime}
              label="All-time cooks"
              isDark={isDark}
              tint={pastelSky}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <StatTile
              testID="stat-cuisines"
              value={stats.cuisinesExplored.length}
              label="Cuisines explored"
              isDark={isDark}
              tint={pastelLavender}
            />
            <StatTile
              testID="stat-streak"
              value={`${stats.currentStreakDays}d`}
              label={`Best: ${stats.longestStreakDays}d`}
              isDark={isDark}
              tint={pastelPeach}
            />
          </View>

          <View style={{ marginBottom: Spacing.sm }}>
            <Text
              style={{
                fontSize: 13,
                marginBottom: 6,
                color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
              }}
            >
              Skill level · {progress ? SKILL_LABEL[progress.currentLevel] : '—'} ·{' '}
              {TREND_LABEL[stats.difficultyTrend]}
            </Text>
          </View>

          {stats.cuisinesExplored.length > 0 && (
            <View>
              <Text
                style={{
                  fontSize: 13,
                  marginBottom: 6,
                  color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
                }}
              >
                Flags collected
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {stats.cuisinesExplored.map((cuisine) => (
                  <View
                    key={cuisine}
                    testID={`cuisine-chip-${cuisine}`}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 100,
                      backgroundColor: pastelSky,
                      marginRight: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: isDark ? DarkColors.text.primary : Colors.text.primary,
                      }}
                    >
                      {cuisine}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      <CookingJourneyEditSheet
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        initialCuisines={stats?.seededCuisines ?? []}
        initialSkillLevel={progress?.currentLevel ?? 'beginner'}
        onSave={seedJourney}
      />
    </View>
  );
}
