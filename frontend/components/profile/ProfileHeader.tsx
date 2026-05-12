// frontend/components/profile/ProfileHeader.tsx
// Profile header with avatar, name, email, and edit name modal

import { View, Text, Modal, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import FrostedHeader from '../ui/FrostedHeader';
import Sazon from '../mascot/Sazon';
import { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import AnimatedStatCounter from '../ui/AnimatedStatCounter';
import ShimmerBadge from '../ui/ShimmerBadge';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Space } from '../../constants/tokens';
import { EditorialFontFamily } from '../../constants/Typography';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserProfile } from '../../types';

interface ProfileHeaderProps {
  profile: UserProfile;
  profilePicture: string | null;
  uploadingPicture: boolean;
  onChangeProfilePicture: () => void;
  onSaveName: (name: string) => Promise<boolean>;
  /** Optional stats for the animated counters strip */
  stats?: {
    savedRecipes: number;
    mealHistory: number;
    mealPlans: number;
  };
  /** Show the shimmer premium badge */
  isPremium?: boolean;
  /** Scroll Y value for stats parallax effect */
  scrollY?: SharedValue<number>;
}

export default function ProfileHeader({
  profile,
  profilePicture,
  uploadingPicture,
  onChangeProfilePicture,
  onSaveName,
  stats,
  isPremium = false,
  scrollY,
}: ProfileHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const flameOpacity = useSharedValue(1);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

  // Subtle pulsing flame animation for streak indicator
  useEffect(() => {
    if (!stats?.mealHistory) {
      flameOpacity.value = 1;
      return;
    }
    flameOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, [stats?.mealHistory, flameOpacity]);

  const flameStyle = useAnimatedStyle(() => ({
    opacity: flameOpacity.value,
  }));

  const statsParallaxStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, 120],
            [0, -12],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        scrollY.value,
        [0, 100],
        [1, 0.7],
        Extrapolation.CLAMP,
      ),
    };
  });

  const handleEditName = () => {
    setEditingName(profile.name);
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) return;
    setUpdatingName(true);
    const success = await onSaveName(editingName);
    setUpdatingName(false);
    if (success) setShowEditNameModal(false);
  };

  return (
    <>
      <FrostedHeader paddingBottom={14} withTopInset>
        <View style={{ paddingHorizontal: Space['5'] }}>
          {/* Editorial title — geometry matches HomeHeader / CookbookHeader /
              MealPlanHeader / EditorialShoppingIntro: Sazon logo (36) +
              Fraunces 36 split (regular + italic accent), FrostedHeader
              paddingBottom 14. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Space['2'],
              marginBottom: 16,
            }}
            accessibilityRole="header"
          >
            <Sazon variant="orange" motion="idle" size={36} />
            <Text
              style={{
                fontFamily: EditorialFontFamily.display.bold,
                fontSize: 36,
                lineHeight: 36 * 1.04,
                letterSpacing: -1.6,
                color: isDark ? '#F3F4F6' : '#111827',
              }}
            >
              Your Pro<Text style={{ fontFamily: EditorialFontFamily.displayItalic.bold, fontStyle: 'italic' }}>file</Text>
            </Text>
          </View>

          {/* Avatar + name row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <HapticTouchableOpacity
              onPress={onChangeProfilePicture}
              disabled={uploadingPicture}
              activeOpacity={0.8}
              style={{ position: 'relative' }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                }}
              >
                {profilePicture ? (
                  <Image
                    source={{ uri: profilePicture }}
                    style={{ width: 72, height: 72, borderRadius: 36 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                ) : (
                  <Text style={{ color: 'white', fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
                    {profile.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                )}
              </View>
              {uploadingPicture ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AnimatedActivityIndicator size="small" color="white" />
                </View>
              ) : (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: isDark ? '#1F2937' : '#FFFFFF',
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  }}
                >
                  <Icon name={Icons.EDIT_OUTLINE} size={12} color="white" accessibilityLabel="Edit profile picture" />
                </View>
              )}
            </HapticTouchableOpacity>

            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    lineHeight: 26,
                    color: isDark ? '#F3F4F6' : '#111827',
                    marginRight: 6,
                  }}
                  numberOfLines={1}
                >
                  {profile.name}
                </Text>
                <HapticTouchableOpacity onPress={handleEditName} activeOpacity={0.7} style={{ padding: 4 }}>
                  <Icon
                    name={Icons.EDIT_OUTLINE}
                    size={IconSizes.SM}
                    color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
                    accessibilityLabel="Edit name"
                  />
                </HapticTouchableOpacity>
              </View>
              <Text style={{ color: isDark ? '#D1D5DB' : '#6B7280', fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                {profile.email}
              </Text>
              {isPremium && (
                <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                  <ShimmerBadge label="✦ Premium" testID="premium-badge" />
                </View>
              )}
            </View>
          </View>

          {/* Animated stats strip — parallax: moves at 0.5x scroll speed */}
          {stats && (
            <Animated.View
              style={[
                {
                  flexDirection: 'row',
                  marginTop: 18,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                },
                statsParallaxStyle,
              ]}
            >
              <View style={{ alignItems: 'center', flex: 1 }}>
                <AnimatedStatCounter
                  value={stats.savedRecipes}
                  delay={0}
                  style={{
                    fontFamily: EditorialFontFamily.display.bold,
                    fontSize: 26,
                    letterSpacing: -0.5,
                    color: isDark ? DarkColors.primary : Colors.primary,
                  }}
                  testID="stat-saved-recipes"
                />
                <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2, fontFamily: EditorialFontFamily.body.medium }}>
                  Saved
                </Text>
              </View>
              <View style={{ width: 1, height: 28, backgroundColor: isDark ? '#374151' : 'rgba(0,0,0,0.08)' }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <AnimatedStatCounter
                  value={stats.mealHistory}
                  delay={100}
                  style={{
                    fontFamily: EditorialFontFamily.display.bold,
                    fontSize: 26,
                    letterSpacing: -0.5,
                    color: isDark ? DarkColors.primary : Colors.primary,
                  }}
                  testID="stat-meals-cooked"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', fontFamily: EditorialFontFamily.body.medium }}>
                    Cooked
                  </Text>
                  {stats.mealHistory > 0 && (
                    <Animated.Text style={[{ fontSize: 11, marginLeft: 3 }, flameStyle]}>🔥</Animated.Text>
                  )}
                </View>
              </View>
              <View style={{ width: 1, height: 28, backgroundColor: isDark ? '#374151' : 'rgba(0,0,0,0.08)' }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <AnimatedStatCounter
                  value={stats.mealPlans}
                  delay={200}
                  style={{
                    fontFamily: EditorialFontFamily.display.bold,
                    fontSize: 26,
                    letterSpacing: -0.5,
                    color: isDark ? DarkColors.primary : Colors.primary,
                  }}
                  testID="stat-meal-plans"
                />
                <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2, fontFamily: EditorialFontFamily.body.medium }}>
                  Meal Plans
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      </FrostedHeader>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Edit Name
            </Text>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Name</Text>
              <TextInput
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                autoComplete="name"
                className=" rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              />
            </View>

            <View className="flex-row space-x-3">
              <HapticTouchableOpacity
                onPress={() => {
                  setShowEditNameModal(false);
                  setEditingName('');
                }}
                disabled={updatingName}
                className="flex-1 py-3 px-4  rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>

              <View className="flex-1">
                <BrandButton
                  label="Save"
                  onPress={handleSaveName}
                  loading={updatingName}
                  disabled={updatingName || !editingName.trim()}
                  size="compact"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
