// frontend/components/home/FilterModal.tsx
// Home screen filter modal — thin wrapper around shared FilterSheet

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import FilterSheet from '../ui/FilterSheet';
import FilterSection from '../ui/FilterSection';
import FilterPill from '../ui/FilterPill';
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

const CRAVING_CHIPS = [
  { label: 'Comfort Food', emoji: '🤗' },
  { label: 'Something Light', emoji: '🥗' },
  { label: 'Spicy', emoji: '🌶️' },
  { label: 'Sweet Tooth', emoji: '🍫' },
  { label: 'Crunchy', emoji: '🥨' },
  { label: 'Warm & Cozy', emoji: '☕' },
  { label: 'Fresh & Cold', emoji: '❄️' },
  { label: 'Cheesy', emoji: '🧀' },
  { label: 'Carb Fix', emoji: '🍝' },
  { label: 'Snacky', emoji: '🍿' },
] as const;

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  filters: FilterState;
  onFilterChange: (type: keyof FilterState, value: any) => void;
  selectedMood?: Mood | null;
  onMoodPress?: () => void;
  onClearMood?: () => void;
  quickMacroFilters?: QuickMacroFilters;
  mealPrepMode?: boolean;
  handleQuickFilter?: (type: keyof FilterState, value: string | number | null | string[]) => void;
  handleQuickMacroFilter?: (filterKey: keyof QuickMacroFilters) => void;
  handleToggleMealPrepMode?: (enabled: boolean) => void;
  darkFeed?: boolean;
  onToggleDarkFeed?: () => void;
  onCravingSearch?: (query: string) => void;
  activeCravingQuery?: string;
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
  darkFeed = false,
  onToggleDarkFeed,
  onCravingSearch,
  activeCravingQuery,
}: FilterModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const totalFilters =
    filters.cuisines.length +
    filters.dietaryRestrictions.length +
    (filters.maxCookTime ? 1 : 0) +
    filters.difficulty.length;

  const handleReset = () => {
    onFilterChange('cuisines', []);
    onFilterChange('dietaryRestrictions', []);
    onFilterChange('maxCookTime', null);
    onFilterChange('difficulty', []);
  };

  // Build quick filters row
  const quickFiltersRow = handleQuickFilter ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {onMoodPress && (
        <FilterPill
          emoji={selectedMood?.emoji || '😊'}
          label={selectedMood?.label || 'Mood'}
          active={!!selectedMood}
          onPress={onMoodPress}
          compact
        />
      )}
      <FilterPill
        emoji="⚡" label="Quick" compact
        active={filters.maxCookTime === 30}
        onPress={() => handleQuickFilter('maxCookTime', filters.maxCookTime === 30 ? null : 30)}
      />
      <FilterPill
        emoji="👍" label="Easy" compact
        active={filters.difficulty.includes('Easy')}
        onPress={() => {
          const isActive = filters.difficulty.includes('Easy');
          handleQuickFilter('difficulty', isActive ? filters.difficulty.filter(d => d !== 'Easy') : [...filters.difficulty, 'Easy']);
        }}
      />
      {handleQuickMacroFilter && quickMacroFilters && (
        <>
          <FilterPill emoji="💪" label="High Protein" compact active={quickMacroFilters.highProtein} onPress={() => handleQuickMacroFilter('highProtein')} />
          <FilterPill emoji="🥩" label="Low Carb" compact active={quickMacroFilters.lowCarb} onPress={() => handleQuickMacroFilter('lowCarb')} />
          <FilterPill emoji="🥗" label="Low Cal" compact active={quickMacroFilters.lowCalorie} onPress={() => handleQuickMacroFilter('lowCalorie')} />
        </>
      )}
      {handleToggleMealPrepMode && (
        <FilterPill emoji="🍱" label="Meal Prep" compact active={mealPrepMode} onPress={() => handleToggleMealPrepMode(!mealPrepMode)} />
      )}
      {onToggleDarkFeed && (
        <FilterPill emoji="🌙" label="Dark Feed" compact active={darkFeed} onPress={onToggleDarkFeed} />
      )}
    </ScrollView>
  ) : undefined;

  return (
    <FilterSheet
      visible={visible}
      onClose={onClose}
      activeFilterCount={totalFilters}
      onReset={handleReset}
      onApply={onApply}
      quickFilters={quickFiltersRow}
    >
      {/* I'm Craving... */}
      {onCravingSearch && (
        <FilterSection title="I'm Craving..." icon="restaurant-outline" activeCount={activeCravingQuery ? 1 : 0}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CRAVING_CHIPS.map(chip => (
              <HapticTouchableOpacity
                key={chip.label}
                onPress={() => onCravingSearch(activeCravingQuery === chip.label ? '' : chip.label)}
                accessibilityLabel={`Craving ${chip.label}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 100,
                  gap: 5,
                  backgroundColor: activeCravingQuery === chip.label
                    ? (isDark ? Colors.primary : Colors.primary)
                    : (isDark ? '#374151' : '#F3F4F6'),
                }}
              >
                <Text style={{ fontSize: 15 }}>{chip.emoji}</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: activeCravingQuery === chip.label
                      ? '#FFF'
                      : (isDark ? '#D1D5DB' : '#374151'),
                  }}
                >
                  {chip.label}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </FilterSection>
      )}

      {/* Cuisine */}
      <FilterSection
        title="Cuisine"
        icon="restaurant-outline"
        activeCount={filters.cuisines.length}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CUISINE_OPTIONS.map((cuisine) => (
            <FilterPill
              key={cuisine}
              label={cuisine}
              active={filters.cuisines.includes(cuisine)}
              onPress={() => onFilterChange('cuisines', cuisine)}
              categoryName={cuisine}
            />
          ))}
        </View>
      </FilterSection>

      {/* Dietary */}
      <FilterSection
        title="Dietary"
        icon="leaf-outline"
        activeCount={filters.dietaryRestrictions.length}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DIETARY_OPTIONS.map((dietary) => (
            <FilterPill
              key={dietary}
              label={dietary}
              active={filters.dietaryRestrictions.includes(dietary)}
              onPress={() => onFilterChange('dietaryRestrictions', dietary)}
              color="green"
            />
          ))}
        </View>
      </FilterSection>

      {/* Cook Time */}
      <FilterSection
        title="Max Cook Time"
        icon="time-outline"
        activeCount={filters.maxCookTime ? 1 : 0}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[15, 30, 45, 60, 90].map((time) => (
            <FilterPill
              key={time}
              label={`≤${time} min`}
              active={filters.maxCookTime === time}
              onPress={() => onFilterChange('maxCookTime', time)}
            />
          ))}
        </View>
      </FilterSection>

      {/* Difficulty */}
      <FilterSection
        title="Difficulty"
        icon="speedometer-outline"
        activeCount={filters.difficulty.length}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DIFFICULTY_OPTIONS.map((difficulty) => (
            <FilterPill
              key={difficulty}
              label={difficulty}
              active={filters.difficulty.includes(difficulty)}
              onPress={() => onFilterChange('difficulty', difficulty)}
            />
          ))}
        </View>
      </FilterSection>
    </FilterSheet>
  );
}
