// frontend/components/ui/QuickFilterChips.tsx
// Quick filter chip bar for one-tap macro and time filters

import { View, ScrollView, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import Icon from './Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

export interface QuickFilter {
  id: string;
  label: string;
  icon?: string;
  color?: string;
}

// Predefined quick filters
export const QUICK_FILTERS: QuickFilter[] = [
  { id: 'high-protein', label: 'High Protein', icon: Icons.BARBELL, color: Colors.tertiaryGreen },
  { id: 'low-carb', label: 'Low Carb', icon: Icons.TRENDING_DOWN, color: Colors.secondaryRed },
  { id: 'low-calorie', label: 'Low Calorie', icon: Icons.FITNESS, color: Colors.primary },
  { id: 'quick', label: 'Quick', icon: Icons.TIME, color: Colors.accentOrange },
];

// Filter criteria for each quick filter
export const QUICK_FILTER_CRITERIA: Record<string, { minProtein?: number; maxCarbs?: number; maxCalories?: number; maxCookTime?: number }> = {
  'high-protein': { minProtein: 30 },
  'low-carb': { maxCarbs: 30 },
  'low-calorie': { maxCalories: 400 },
  'quick': { maxCookTime: 20 },
};

interface QuickFilterChipsProps {
  activeFilters: string[];
  onToggle: (filterId: string) => void;
  disabled?: boolean;
}

export default function QuickFilterChips({
  activeFilters,
  onToggle,
  disabled = false
}: QuickFilterChipsProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {QUICK_FILTERS.map((filter) => {
          const isActive = activeFilters.includes(filter.id);
          const chipColor = filter.color || Colors.primary;
          const darkChipColor = isDark ? `${chipColor}CC` : chipColor;

          return (
            <HapticTouchableOpacity
              key={filter.id}
              onPress={() => onToggle(filter.id)}
              disabled={disabled}
              hapticStyle="light"
              className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                isActive
                  ? ''
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
              style={isActive ? {
                backgroundColor: darkChipColor,
                borderColor: darkChipColor,
              } : undefined}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${filter.label} filter ${isActive ? 'active' : 'inactive'}`}
            >
              {filter.icon && (
                <Icon
                  name={filter.icon}
                  size={IconSizes.XS}
                  color={isActive ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')}
                  accessibilityLabel=""
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                className={`text-sm font-medium ${
                  isActive ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {filter.label}
              </Text>
              {isActive && (
                <Icon
                  name={Icons.CLOSE}
                  size={IconSizes.XS}
                  color="#FFFFFF"
                  accessibilityLabel="Remove filter"
                  style={{ marginLeft: 4 }}
                />
              )}
            </HapticTouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
