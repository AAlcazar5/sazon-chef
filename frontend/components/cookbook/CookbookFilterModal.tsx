// frontend/components/cookbook/CookbookFilterModal.tsx
// Cookbook filter modal — thin wrapper around shared FilterSheet

import React from 'react';
import { View, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import FilterSheet from '../ui/FilterSheet';
import FilterSection from '../ui/FilterSection';
import FilterPill from '../ui/FilterPill';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
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

  const activeFilterCount =
    (filters.maxCookTime !== null ? 1 : 0) +
    filters.difficulty.length +
    (filters.mealPrepOnly ? 1 : 0) +
    (filters.highProtein ? 1 : 0) +
    (filters.lowCal ? 1 : 0) +
    (filters.budget ? 1 : 0) +
    (filters.onePot ? 1 : 0);

  const handleReset = () => {
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

  // Quick filters row
  const quickFiltersRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      <FilterPill
        emoji="⚡" label="Quick" compact categoryName="quick"
        active={filters.maxCookTime === 30}
        onPress={() => {
          onFilterChange({ ...filters, maxCookTime: filters.maxCookTime === 30 ? null : 30 });
          HapticPatterns.buttonPress();
        }}
      />
      <FilterPill
        emoji="✨" label="Easy" compact
        active={filters.difficulty.includes('Easy')}
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
      <FilterPill emoji="💪" label="High Protein" compact categoryName="High Protein" active={filters.highProtein} onPress={() => { onFilterChange({ ...filters, highProtein: !filters.highProtein }); HapticPatterns.buttonPress(); }} />
      <FilterPill emoji="🥗" label="Low Cal" compact categoryName="healthy" active={filters.lowCal} onPress={() => { onFilterChange({ ...filters, lowCal: !filters.lowCal }); HapticPatterns.buttonPress(); }} />
      <FilterPill emoji="🍱" label="Meal Prep" compact categoryName="Meal Prep" active={filters.mealPrepOnly} onPress={() => { onFilterChange({ ...filters, mealPrepOnly: !filters.mealPrepOnly }); HapticPatterns.buttonPress(); }} />
      <FilterPill emoji="💰" label="Budget" compact categoryName="budget" active={filters.budget} onPress={() => { onFilterChange({ ...filters, budget: !filters.budget }); HapticPatterns.buttonPress(); }} />
      <FilterPill emoji="🍲" label="One Pot" compact categoryName="Soup" active={filters.onePot} onPress={() => { onFilterChange({ ...filters, onePot: !filters.onePot }); HapticPatterns.buttonPress(); }} />
    </ScrollView>
  );

  return (
    <FilterSheet
      visible={visible}
      onClose={onClose}
      activeFilterCount={activeFilterCount}
      onReset={handleReset}
      onApply={onClose}
      quickFilters={quickFiltersRow}
      snapPoints={['85%']}
    >
      {/* Layout */}
      <FilterSection title="Layout" icon="grid-outline" defaultExpanded>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <FilterPill label="List" active={displayMode === 'list'} onPress={() => onDisplayModeChange('list')} />
          <FilterPill label="Grid" active={displayMode === 'grid'} onPress={() => onDisplayModeChange('grid')} />
        </View>
      </FilterSection>

      {/* Show */}
      <FilterSection title="Show" icon="eye-outline">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <FilterPill label="Saved" active={viewMode === 'saved'} onPress={() => onViewModeChange('saved')} />
          <FilterPill label="Liked" active={viewMode === 'liked'} onPress={() => onViewModeChange('liked')} />
          <FilterPill label="Disliked" active={viewMode === 'disliked'} onPress={() => onViewModeChange('disliked')} />
        </View>
      </FilterSection>

      {/* Collections */}
      {collections.length > 0 && (
        <FilterSection
          title="Collection"
          icon="folder-outline"
          activeCount={selectedListId ? 1 : 0}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <FilterPill label="All" active={selectedListId === null} onPress={() => onSelectList(null)} />
            {collections.map((collection) => (
              <FilterPill
                key={collection.id}
                label={collection.name}
                active={selectedListId === collection.id}
                onPress={() => onSelectList(collection.id)}
              />
            ))}
          </View>
        </FilterSection>
      )}

      {/* Sort */}
      <FilterSection title="Sort by" icon="swap-vertical-outline">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { value: 'recent' as const, label: 'Recent' },
            { value: 'rating' as const, label: 'My Rating' },
            { value: 'mostCooked' as const, label: 'Most Cooked' },
            { value: 'alphabetical' as const, label: 'A–Z' },
            { value: 'cuisine' as const, label: 'Cuisine' },
            { value: 'matchScore' as const, label: 'Match' },
            { value: 'cookTime' as const, label: 'Cook Time' },
          ].map((option) => (
            <FilterPill
              key={option.value}
              label={option.label}
              active={sortBy === option.value}
              onPress={() => onSortChange(option.value)}
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
              onPress={() => onFilterChange({ ...filters, maxCookTime: filters.maxCookTime === time ? null : time })}
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
          {(['Easy', 'Medium', 'Hard'] as const).map((difficulty) => (
            <FilterPill
              key={difficulty}
              label={difficulty}
              active={filters.difficulty.includes(difficulty)}
              onPress={() => {
                const isActive = filters.difficulty.includes(difficulty);
                onFilterChange({
                  ...filters,
                  difficulty: isActive
                    ? filters.difficulty.filter(d => d !== difficulty)
                    : [...filters.difficulty, difficulty],
                });
              }}
            />
          ))}
        </View>
      </FilterSection>

      {/* Dietary */}
      <FilterSection
        title="Dietary"
        icon="leaf-outline"
        activeCount={
          [filters.mealPrepOnly, filters.highProtein, filters.lowCal, filters.budget, filters.onePot].filter(Boolean).length
        }
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { key: 'mealPrepOnly' as const, label: 'Meal Prep', emoji: '🍱', cat: 'Meal Prep' },
            { key: 'highProtein' as const, label: 'High Protein', emoji: '💪', cat: 'High Protein' },
            { key: 'lowCal' as const, label: 'Low Calorie', emoji: '🥗', cat: 'healthy' },
            { key: 'budget' as const, label: 'Budget', emoji: '💰', cat: 'budget' },
            { key: 'onePot' as const, label: 'One Pot', emoji: '🍲', cat: 'Soup' },
          ].map(({ key, label, emoji, cat }) => (
            <FilterPill
              key={key}
              emoji={emoji}
              label={label}
              active={!!filters[key]}
              onPress={() => onFilterChange({ ...filters, [key]: !filters[key] })}
              categoryName={cat}
            />
          ))}
        </View>
      </FilterSection>
    </FilterSheet>
  );
}
