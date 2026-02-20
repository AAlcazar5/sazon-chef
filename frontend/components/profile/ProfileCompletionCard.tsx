// frontend/components/profile/ProfileCompletionCard.tsx
// Profile completion progress bar with gamification and milestones

import { View, Text, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';

interface ProfileCompletionCardProps {
  profileCompletion: {
    physicalProfile: boolean;
    macroGoals: boolean;
    preferences: boolean;
    percentage: number;
  };
}

const COMPLETION_ITEMS = [
  { key: 'physicalProfile' as const, label: 'Physical Profile', icon: '💪', reward: 'Unlocks personalized recommendations' },
  { key: 'macroGoals' as const, label: 'Macro Goals', icon: '🎯', reward: 'Enables macro-matched recipes' },
  { key: 'preferences' as const, label: 'Culinary Preferences', icon: '👨‍🍳', reward: 'Tailors cuisine & dietary filters' },
];

const MILESTONES = [
  { threshold: 33, label: 'Getting Started', emoji: '🌱' },
  { threshold: 66, label: 'Making Progress', emoji: '🔥' },
  { threshold: 100, label: 'Profile Complete!', emoji: '🏆' },
];

function getMilestone(percentage: number) {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (percentage >= MILESTONES[i].threshold) {
      return MILESTONES[i];
    }
  }
  return null;
}

function getNextMilestone(percentage: number) {
  return MILESTONES.find(m => m.threshold > percentage) || null;
}

export default function ProfileCompletionCard({ profileCompletion }: ProfileCompletionCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: profileCompletion.percentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [profileCompletion.percentage]);

  if (profileCompletion.percentage >= 100) {
    return (
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <View className="items-center py-2">
          <Text className="text-3xl mb-2">🏆</Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">Profile Complete!</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
            You've unlocked all personalized features. Sazon knows you well!
          </Text>
        </View>
      </View>
    );
  }

  const currentMilestone = getMilestone(profileCompletion.percentage);
  const nextMilestone = getNextMilestone(profileCompletion.percentage);
  const completedCount = [profileCompletion.physicalProfile, profileCompletion.macroGoals, profileCompletion.preferences].filter(Boolean).length;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenDark }}>
            <Text className="text-xl">{currentMilestone?.emoji || '📊'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {currentMilestone?.label || 'Profile Setup'}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {completedCount}/3 sections complete
            </Text>
          </View>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
            {profileCompletion.percentage}%
          </Text>
        </View>
      </View>

      {/* Animated Progress Bar with Milestone Markers */}
      <View className="mb-4">
        <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <Animated.View
            className="h-full rounded-full"
            style={{
              width: progressWidth,
              backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
            }}
          />
        </View>
        {/* Milestone dots */}
        <View className="flex-row justify-between mt-1 px-0.5">
          {MILESTONES.map((milestone) => (
            <View key={milestone.threshold} className="items-center">
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: profileCompletion.percentage >= milestone.threshold
                    ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                    : (isDark ? '#374151' : '#D1D5DB'),
                }}
              />
              <Text className="text-[10px] mt-0.5" style={{
                color: profileCompletion.percentage >= milestone.threshold
                  ? (isDark ? '#34D399' : Colors.tertiaryGreen)
                  : (isDark ? '#6B7280' : '#9CA3AF'),
              }}>
                {milestone.threshold}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Next Milestone */}
      {nextMilestone && (
        <View
          className="flex-row items-center p-3 rounded-lg mb-4"
          style={{
            backgroundColor: isDark ? '#1E293B' : '#FFF7ED',
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#FED7AA',
          }}
        >
          <Text className="text-base mr-2">{nextMilestone.emoji}</Text>
          <Text className="text-sm flex-1 text-gray-700 dark:text-gray-300">
            <Text className="font-semibold">Next: </Text>
            {nextMilestone.label} at {nextMilestone.threshold}%
          </Text>
        </View>
      )}

      {/* Completion Checklist with Rewards */}
      <View style={{ gap: 10 }}>
        {COMPLETION_ITEMS.map(({ key, label, icon, reward }) => {
          const completed = profileCompletion[key];
          return (
            <View
              key={key}
              className="flex-row items-center p-3 rounded-lg"
              style={{
                backgroundColor: completed
                  ? (isDark ? '#064E3B33' : '#ECFDF5')
                  : (isDark ? '#1F293733' : '#F9FAFB'),
              }}
            >
              <Text className="text-lg mr-3">{icon}</Text>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Icon
                    name={completed ? Icons.CHECKMARK_CIRCLE : Icons.CHECKMARK_CIRCLE_OUTLINE}
                    size={IconSizes.SM}
                    color={completed
                      ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                      : (isDark ? DarkColors.text.secondary : Colors.text.secondary)
                    }
                    accessibilityLabel={completed ? 'Completed' : 'Not completed'}
                  />
                  <Text
                    className={`ml-2 text-sm font-semibold ${completed
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {label}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-0.5">
                  {completed ? '✓ ' : ''}{reward}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
