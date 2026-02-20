// frontend/components/profile/PhysicalProfileCard.tsx
// Physical profile display card with help tooltip

import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useState } from 'react';
import { router } from 'expo-router';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import HelpTooltip from '../ui/HelpTooltip';

interface PhysicalProfileCardProps {
  physicalProfile: any | null;
}

export default function PhysicalProfileCard({ physicalProfile }: PhysicalProfileCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center">
            <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedDark }}>
              <Icon name={Icons.PHYSICAL_PROFILE} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : '#FFFFFF'} accessibilityLabel="Physical profile" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Physical Profile</Text>
            <HapticTouchableOpacity
              onPress={() => setShowHelp(true)}
              className="ml-2 p-1"
              hapticStyle="light"
            >
              <Icon name={Icons.INFO_OUTLINE} size={IconSizes.SM} color="#6B7280" accessibilityLabel="Help" />
            </HapticTouchableOpacity>
          </View>
          <HapticTouchableOpacity onPress={() => router.push('/edit-physical-profile')}>
            <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
          </HapticTouchableOpacity>
        </View>

        {physicalProfile ? (
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Gender</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{physicalProfile.gender}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Age</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">{physicalProfile.age} years</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Height</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {(() => {
                  const totalInches = physicalProfile.heightCm / 2.54;
                  const feet = Math.floor(totalInches / 12);
                  const inches = Math.round(totalInches % 12);
                  return `${feet}'${inches}" (${physicalProfile.heightCm} cm)`;
                })()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Weight</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {Math.round(physicalProfile.weightKg * 2.20462 * 10) / 10} lbs ({physicalProfile.weightKg} kg)
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Activity Level</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {physicalProfile.activityLevel.replace('_', ' ')}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Fitness Goal</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {physicalProfile.fitnessGoal.replace('_', ' ')}
              </Text>
            </View>
            {physicalProfile.targetWeightKg && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Target Weight</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100">
                  {Math.round(physicalProfile.targetWeightKg * 2.20462 * 10) / 10} lbs ({physicalProfile.targetWeightKg} kg)
                </Text>
              </View>
            )}
            {(physicalProfile.bmr || physicalProfile.tdee) && (
              <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                {physicalProfile.bmr && (
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-600 dark:text-gray-200">BMR</Text>
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(physicalProfile.bmr)} cal/day</Text>
                  </View>
                )}
                {physicalProfile.tdee && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600 dark:text-gray-200">TDEE</Text>
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(physicalProfile.tdee)} cal/day</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <HapticTouchableOpacity
            onPress={() => router.push('/edit-physical-profile')}
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: isDark ? `${Colors.primaryLight}1A` : Colors.primaryDark,
              borderColor: isDark ? DarkColors.primary : Colors.primaryDark,
            }}
          >
            <View className="flex-row items-center">
              <Icon name={Icons.PHYSICAL_PROFILE} size={IconSizes.MD} color={isDark ? DarkColors.primary : '#FFFFFF'} accessibilityLabel="Physical profile" />
              <Text className="font-medium ml-2" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
                Set up your physical profile
              </Text>
            </View>
            <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
              Get personalized macro calculations based on your body metrics
            </Text>
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
