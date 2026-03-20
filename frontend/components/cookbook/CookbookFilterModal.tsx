// frontend/components/cookbook/CookbookFilterModal.tsx
// Unified filter bottom sheet — quick filters + view mode + collection + sort + cook time + difficulty + dietary (P5/P7/P11)

import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BottomSheet from '../ui/BottomSheet';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { HapticPatterns } from '../../constants/Haptics';

export interface CookbookFilters {
  maxCookTime: number | null;
  difficulty: Array<'Easy' | 'Medium' | 'Hard'>;
  mealPrepOnly: boolean;
  highProtein: boolean;
  lowCal: boolean;
  budget: boolean;
  onePot: boolean;
}

// Collection type re-exported from global types
export type { Collection } from '../../types';

export type ViewMode = 'saved' | 'liked' | 'disliked';
export type SortOption = 'recent' | 'alphabetical' | 'cuisine' | 'matchScore' | 'cookTime' | 'rating' | 'mostCooked';

interface CookbookFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: CookbookFilters;
  onFilterChange: (filters: CookbookFilters) => void;
  collections: any[];
  selectedListId: string | null;
  onSelectList: (id: string | null) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  displayMode: 'grid' | 'list';
  onDisplayModeChange: (mode: 'grid' | 'list') => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

/**
 * Unified filter bottom sheet for cookbook.
 * Quick filter chips at top, then view/collection/sort/cook time/difficulty/dietary sections.
 * Elevation-over-borders (P11), max 3 options per row (P5), friendly labels (P7).
 */
export default function CookbookFilterModal({
  visible,
  onClose,
  filters,
  onFilterChange,
  collections,
  selectedListId,
  onSelectList,
  viewMode,
  onViewModeChange,
  displayMode,
  onDisplayModeChange,
  sortBy,
  onSortChange,
}: CookbookFilterModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const pillStyle = (isActive: boolean, color?: 'green') => ({
    backgroundColor: isActive
      ? (color === 'green'
        ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
        : (isDark ? DarkColors.primary : Colors.primary))
      : (isDark ? '#374151' : '#F3F4F6'),
    ...(isActive ? Shadows.SM : {}),
  });

  const pillText = (isActive: boolean) =>
    `text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`;

  const handleResetFilters = () => {
    onFilterChange({
      maxCookTime: null,
      difficulty: [],
      mealPrepOnly: false,
      highProtein: false,
      lowCal: false,
      budget: false,
      onePot: false,
    });
  };

  const hasActiveFilters =
    filters.maxCookTime !== null ||
    filters.difficulty.length > 0 ||
    filters.mealPrepOnly ||
    filters.highProtein ||
    filters.lowCal ||
    filters.budget ||
    filters.onePot;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      snapPoints={['85%']}
      scrollable
    >
      <ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Filters */}
        <View className="mb-5">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Quick Filters
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <QuickChip
              active={filters.maxCookTime === 30}
              emoji="⚡" label="Quick" isDark={isDark}
              onPress={() => {
                onFilterChange({ ...filters, maxCookTime: filters.maxCookTime === 30 ? null : 30 });
                HapticPatterns.buttonPress();
              }}
            />
            <QuickChip
              active={filters.difficulty.includes('Easy')}
              emoji="✨" label="Easy" isDark={isDark}
              onPress={() => {
                const isActive = filters.difficulty.includes('Easy');
                onFilterChange({
                  ...filters,
                  difficulty: isActive
                    ? filters.difficulty.filter(d => d !== 'Easy')
                    : [...filters.difficulty, 'Easy'],
                });
                HapticPatterns.buttonPress();
              }}
            />
            <QuickChip
              active={filters.highProtein}
              emoji="💪" label="High Protein" isDark={isDark}
              onPress={() => { onFilterChange({ ...filters, highProtein: !filters.highProtein }); HapticPatterns.buttonPress(); }}
            />
            <QuickChip
              active={filters.lowCal}
              emoji="🥗" label="Low Cal" isDark={isDark}
              onPress={() => { onFilterChange({ ...filters, lowCal: !filters.lowCal }); HapticPatterns.buttonPress(); }}
            />
            <QuickChip
              active={filters.mealPrepOnly}
              emoji="🍱" label="Meal Prep" isDark={isDark}
              onPress={() => { onFilterChange({ ...filters, mealPrepOnly: !filters.mealPrepOnly }); HapticPatterns.buttonPress(); }}
            />
            <QuickChip
              active={filters.budget}
              emoji="💰" label="Budget" isDark={isDark}
              onPress={() => { onFilterChange({ ...filters, budget: !filters.budget }); HapticPatterns.buttonPress(); }}
            />
            <QuickChip
              active={filters.onePot}
              emoji="🍲" label="One Pot" isDark={isDark}
              onPress={() => { onFilterChange({ ...filters, onePot: !filters.onePot }); HapticPatterns.buttonPress(); }}
            />
          </ScrollView>
        </View>

        {/* Display Mode (grid/list) */}
        <View className="mb-5">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Layout
          </Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {([
              { value: 'list' as const, label: 'List', icon: Icons.SHOPPING_LIST },
              { value: 'grid' as const, label: 'Grid', icon: Icons.GRID_OUTLINE },
            ] as const).map((option) => (
              <HapticTouchableOpacity
                key={option.value}
                onPress={() => onDisplayModeChange(option.value)}
                className="px-4 py-2.5 rounded-full flex-row items-center"
                style={pillStyle(displayMode === option.value)}
              >
                <Icon
                  name={option.icon}
                  size={IconSizes.SM}
                  color={displayMode === option.value ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')}
                  accessibilityLabel={option.label}
                />
                <Text className={`${pillText(displayMode === option.value)} ml-1.5`}>
                  {option.label}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* View Mode */}
        <View className="mb-5">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Show
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {[
              { value: 'saved' as const, label: 'Saved', icon: Icons.BOOKMARK },
              { value: 'liked' as const, label: 'Liked', icon: Icons.LIKE },
              { value: 'disliked' as const, label: 'Disliked', icon: Icons.DISLIKE },
            ].map((option) => (
              <HapticTouchableOpacity
                key={option.value}
                onPress={() => onViewModeChange(option.value)}
                className="px-4 py-2.5 rounded-full flex-row items-center"
                style={pillStyle(viewMode === option.value)}
              >
                <Text className={pillText(viewMode === option.value)}>
                  {option.label}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Collections */}
        {collections.length > 0 && (
          <View className="mb-5">
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Collection
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              <HapticTouchableOpacity
                onPress={() => onSelectList(null)}
                className="px-4 py-2.5 rounded-full"
                style={pillStyle(selectedListId === null)}
              >
                <Text className={pillText(selectedListId === null)}>All</Text>
              </HapticTouchableOpacity>
              {collections.map((collection) => (
                <HapticTouchableOpacity
                  key={collection.id}
                  onPress={() => onSelectList(collection.id)}
                  className="px-4 py-2.5 rounded-full"
                  style={pillStyle(selectedListId === collection.id)}
                >
                  <Text className={pillText(selectedListId === collection.id)}>
                    {collection.name}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sort */}
        <View className="mb-5">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Sort by
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {[
              { value: 'recent' as const, label: 'Recent' },
              { value: 'rating' as const, label: 'My Rating' },
              { value: 'mostCooked' as const, label: 'Most Cooked' },
              { value: 'alphabetical' as const, label: 'A–Z' },
              { value: 'cuisine' as const, label: 'Cuisine' },
              { value: 'matchScore' as const, label: 'Match' },
              { value: 'cookTime' as const, label: 'Cook Time' },
            ].map((option) => (
              <HapticTouchableOpacity
                key={option.value}
                onPress={() => onSortChange(option.value)}
                className="px-4 py-2.5 rounded-full"
                style={pillStyle(sortBy === option.value)}
              >
                <Text className={pillText(sortBy === option.value)}>
                  {option.label}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cook Time */}
        <View className="mb-5">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Max cook time
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {[15, 30, 45, 60, 90].map((time) => (
              <HapticTouchableOpacity
                key={time}
                onPress={() => onFilterChange({ ...filters, maxCookTime: filters.maxCookTime === time ? null : time })}
                className="px-4 py-2.5 rounded-full"
                style={pillStyle(filters.maxCookTime === time)}
              >
                <Text className={pillText(filters.maxCookTime === time)}>
                  ≤{time} min
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty */}
        <View className="mb-5">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Difficulty
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {(['Easy', 'Medium', 'Hard'] as const).map((difficulty) => {
              const isActive = filters.difficulty.includes(difficulty);
              return (
                <HapticTouchableOpacity
                  key={difficulty}
                  onPress={() => {
                    onFilterChange({
                      ...filters,
                      difficulty: isActive
                        ? filters.difficulty.filter(d => d !== difficulty)
                        : [...filters.difficulty, difficulty],
                    });
                  }}
                  className="px-4 py-2.5 rounded-full"
                  style={pillStyle(isActive)}
                >
                  <Text className={pillText(isActive)}>
                    {difficulty}
                  </Text>
                </HapticTouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Dietary */}
        <View className="mb-5">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Dietary
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {[
              { key: 'mealPrepOnly', label: '🍱 Meal Prep' },
              { key: 'highProtein', label: '💪 High Protein' },
              { key: 'lowCal', label: '🥗 Low Calorie' },
              { key: 'budget', label: '💰 Budget' },
              { key: 'onePot', label: '🍲 One Pot' },
            ].map(({ key, label }) => {
              const isActive = !!filters[key as keyof CookbookFilters];
              return (
                <HapticTouchableOpacity
                  key={key}
                  onPress={() => onFilterChange({ ...filters, [key]: !filters[key as keyof CookbookFilters] as boolean })}
                  className="px-4 py-2.5 rounded-full"
                  style={pillStyle(isActive, 'green')}
                >
                  <Text className={pillText(isActive)}>
                    {label}
                  </Text>
                </HapticTouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Reset filters */}
        {hasActiveFilters && (
          <HapticTouchableOpacity
            onPress={handleResetFilters}
            className="self-center px-5 py-2.5 rounded-full mt-2"
            style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
          >
            <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
              Reset all filters
            </Text>
          </HapticTouchableOpacity>
        )}
      </ScrollView>
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
