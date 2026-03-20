// frontend/components/home/FilterModal.tsx
// Filter bottom sheet for recipe search filters

import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BottomSheet from '../ui/BottomSheet';
import { AnimatedLogoMascot } from '../mascot';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { FilterState } from '../../lib/filterStorage';
import {
  CUISINE_OPTIONS,
  DIETARY_OPTIONS,
  DIFFICULTY_OPTIONS,
} from '../../utils/filterUtils';
import type { Mood } from '../ui/MoodSelector';
import type { QuickMacroFilters } from './QuickFiltersBar';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  filters: FilterState;
  onFilterChange: (type: keyof FilterState, value: any) => void;
  /** Quick filter props */
  selectedMood?: Mood | null;
  onMoodPress?: () => void;
  onClearMood?: () => void;
  quickMacroFilters?: QuickMacroFilters;
  mealPrepMode?: boolean;
  handleQuickFilter?: (type: keyof FilterState, value: string | number | null | string[]) => void;
  handleQuickMacroFilter?: (filterKey: keyof QuickMacroFilters) => void;
  handleToggleMealPrepMode?: (enabled: boolean) => void;
}

export default function FilterModal({
  visible,
  onClose,
  onApply,
  filters,
  onFilterChange,
  selectedMood,
  onMoodPress,
  onClearMood,
  quickMacroFilters,
  mealPrepMode = false,
  handleQuickFilter,
  handleQuickMacroFilter,
  handleToggleMealPrepMode,
}: FilterModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const totalFilters =
    filters.cuisines.length +
    filters.dietaryRestrictions.length +
    (filters.maxCookTime ? 1 : 0) +
    filters.difficulty.length;
  const isRestrictive = totalFilters >= 5;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      snapPoints={['75%', '92%']}
      scrollable
    >
      {/* Apply / Cancel row */}
      <View className="flex-row items-center justify-between px-4 pb-2">
        <HapticTouchableOpacity onPress={onClose} style={{ paddingVertical: 8 }}>
          <Text
            className="font-medium"
            style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
          >
            Cancel
          </Text>
        </HapticTouchableOpacity>
        <HapticTouchableOpacity onPress={onApply} style={{ paddingVertical: 8 }}>
          <Text
            className="font-medium"
            style={{ color: isDark ? DarkColors.primary : Colors.primary }}
          >
            Apply
          </Text>
        </HapticTouchableOpacity>
      </View>

      <View className="px-4 pb-6">
        {/* Quick Filters */}
        {handleQuickFilter && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Quick Filters
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {/* Mood */}
              {onMoodPress && (
                <HapticTouchableOpacity
                  onPress={onMoodPress}
                  className="px-4 py-2 rounded-full flex-row items-center"
                  style={{ backgroundColor: selectedMood ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? '#374151' : '#F3F4F6') }}
                >
                  <Text className="text-base">{selectedMood?.emoji || '😊'}</Text>
                  <Text className="text-sm font-semibold ml-1.5" style={{ color: selectedMood ? '#FFF' : (isDark ? '#D1D5DB' : '#374151') }}>
                    {selectedMood?.label || 'Mood'}
                  </Text>
                  {selectedMood && onClearMood && (
                    <HapticTouchableOpacity
                      onPress={(e) => { e.stopPropagation(); onClearMood(); }}
                      className="ml-2 w-4 h-4 rounded-full bg-white/30 items-center justify-center"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={12} color="white" />
                    </HapticTouchableOpacity>
                  )}
                </HapticTouchableOpacity>
              )}

              {/* Quick <30min */}
              <QuickChip
                active={filters.maxCookTime === 30}
                emoji="⚡" label="Quick" isDark={isDark}
                onPress={() => { handleQuickFilter('maxCookTime', filters.maxCookTime === 30 ? null : 30); HapticPatterns.buttonPress(); }}
              />
              {/* Easy */}
              <QuickChip
                active={filters.difficulty.includes('Easy')}
                emoji="👍" label="Easy" isDark={isDark}
                onPress={() => {
                  const isActive = filters.difficulty.includes('Easy');
                  handleQuickFilter('difficulty', isActive ? filters.difficulty.filter(d => d !== 'Easy') : [...filters.difficulty, 'Easy']);
                  HapticPatterns.buttonPress();
                }}
              />
              {/* High Protein */}
              {handleQuickMacroFilter && quickMacroFilters && (
                <>
                  <QuickChip active={quickMacroFilters.highProtein} emoji="💪" label="High Protein" isDark={isDark} onPress={() => handleQuickMacroFilter('highProtein')} />
                  <QuickChip active={quickMacroFilters.lowCarb} emoji="🥩" label="Low Carb" isDark={isDark} onPress={() => handleQuickMacroFilter('lowCarb')} />
                  <QuickChip active={quickMacroFilters.lowCalorie} emoji="🥗" label="Low Cal" isDark={isDark} onPress={() => handleQuickMacroFilter('lowCalorie')} />
                </>
              )}
              {/* Meal Prep */}
              {handleToggleMealPrepMode && (
                <QuickChip
                  active={mealPrepMode}
                  emoji="🍱" label="Meal Prep" isDark={isDark}
                  onPress={() => { handleToggleMealPrepMode(!mealPrepMode); HapticPatterns.buttonPress(); }}
                />
              )}
              {/* Budget */}
              <QuickChip
                active={filters.dietaryRestrictions.includes('Budget-Friendly')}
                emoji="💰" label="Budget" isDark={isDark}
                onPress={() => {
                  const isActive = filters.dietaryRestrictions.includes('Budget-Friendly');
                  handleQuickFilter('dietaryRestrictions', isActive ? filters.dietaryRestrictions.filter(d => d !== 'Budget-Friendly') : [...filters.dietaryRestrictions, 'Budget-Friendly']);
                  HapticPatterns.buttonPress();
                }}
              />
              {/* One Pot */}
              <QuickChip
                active={filters.dietaryRestrictions.includes('One-Pot')}
                emoji="🍲" label="One Pot" isDark={isDark}
                onPress={() => {
                  const isActive = filters.dietaryRestrictions.includes('One-Pot');
                  handleQuickFilter('dietaryRestrictions', isActive ? filters.dietaryRestrictions.filter(d => d !== 'One-Pot') : [...filters.dietaryRestrictions, 'One-Pot']);
                  HapticPatterns.buttonPress();
                }}
              />
            </ScrollView>
          </View>
        )}

        {/* Cuisine */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Cuisine
          </Text>
          <View className="flex-row flex-wrap">
            {CUISINE_OPTIONS.map((cuisine) => (
              <HapticTouchableOpacity
                key={cuisine}
                onPress={() => onFilterChange('cuisines', cuisine)}
                className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                  filters.cuisines.includes(cuisine)
                    ? ''
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                style={
                  filters.cuisines.includes(cuisine)
                    ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.cuisines.includes(cuisine)
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-100'
                  }`}
                >
                  {cuisine}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dietary */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Dietary
          </Text>
          <View className="flex-row flex-wrap">
            {DIETARY_OPTIONS.map((dietary) => (
              <HapticTouchableOpacity
                key={dietary}
                onPress={() => onFilterChange('dietaryRestrictions', dietary)}
                className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                  filters.dietaryRestrictions.includes(dietary)
                    ? ''
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                style={
                  filters.dietaryRestrictions.includes(dietary)
                    ? {
                        backgroundColor: isDark
                          ? DarkColors.tertiaryGreen
                          : Colors.tertiaryGreen,
                        borderColor: isDark
                          ? DarkColors.tertiaryGreen
                          : Colors.tertiaryGreen,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.dietaryRestrictions.includes(dietary)
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-100'
                  }`}
                >
                  {dietary}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cook Time */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Max Cook Time
          </Text>
          <View className="flex-row flex-wrap">
            {[15, 30, 45, 60, 90].map((time) => (
              <HapticTouchableOpacity
                key={time}
                onPress={() => onFilterChange('maxCookTime', time)}
                className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                  filters.maxCookTime === time
                    ? ''
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                style={
                  filters.maxCookTime === time
                    ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.maxCookTime === time
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-100'
                  }`}
                >
                  ≤{time} min
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Difficulty
          </Text>
          <View className="flex-row flex-wrap">
            {DIFFICULTY_OPTIONS.map((difficulty) => (
              <HapticTouchableOpacity
                key={difficulty}
                onPress={() => onFilterChange('difficulty', difficulty)}
                className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                  filters.difficulty.includes(difficulty)
                    ? ''
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                style={
                  filters.difficulty.includes(difficulty)
                    ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.difficulty.includes(difficulty)
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-100'
                  }`}
                >
                  {difficulty}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Guidance when many filters selected */}
        {isRestrictive && (
          <View
            className="mb-4 p-4 rounded-lg border"
            style={{
              borderColor: isDark ? '#7c3421' : '#fed7aa',
              backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
            }}
          >
            <View className="flex-row items-start">
              <View className="mr-3">
                <AnimatedLogoMascot
                  expression="thinking"
                  size="small"
                  animationType="idle"
                />
              </View>
              <View className="flex-1">
                <Text
                  className="font-semibold mb-1"
                  style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}
                >
                  Many filters selected
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: isDark ? DarkColors.primary : Colors.primary }}
                >
                  You've selected {totalFilters} filter
                  {totalFilters !== 1 ? 's' : ''}. This might limit your recipe options.
                  Consider removing some to see more suggestions!
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

/** Simple quick-filter chip (no spring animation — inside a scrollable sheet) */
function QuickChip({
  active,
  emoji,
  label,
  onPress,
  isDark,
}: {
  active: boolean;
  emoji: string;
  label: string;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <HapticTouchableOpacity
      onPress={onPress}
      className="px-4 py-2 rounded-full flex-row items-center"
      style={{ backgroundColor: active ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? '#374151' : '#F3F4F6') }}
    >
      <Text className="text-base">{emoji}</Text>
      <Text
        className="text-sm font-semibold ml-1.5"
        style={{ color: active ? '#FFF' : (isDark ? '#D1D5DB' : '#374151') }}
      >
        {label}
      </Text>
    </HapticTouchableOpacity>
  );
}
