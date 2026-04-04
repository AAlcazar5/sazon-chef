// frontend/components/ui/QuickFilterChips.tsx
// Quick filter chip bar for one-tap macro and time filters

import { View, ScrollView, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import Icon from './Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { getCategoryColor } from '../../constants/CategoryColors';

export interface QuickFilter {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  /** Maps to CATEGORY_COLORS key for pastel tint + emoji */
  categoryKey?: string;
}

// Predefined quick filters — each maps to a CATEGORY_COLORS key for pastel styling
export const QUICK_FILTERS: QuickFilter[] = [
  { id: 'high-protein', label: 'High Protein', icon: Icons.FLAME, color: Colors.tertiaryGreen, categoryKey: 'High Protein' },
  { id: 'low-carb', label: 'Low Carb', icon: Icons.NUTRITION, color: Colors.secondaryRed, categoryKey: 'Low Carb' },
  { id: 'low-calorie', label: 'Low Calorie', icon: Icons.NUTRITION_OUTLINE, color: Colors.primary, categoryKey: 'healthy' },
  { id: 'quick', label: 'Quick', icon: Icons.TIME, color: Colors.accent, categoryKey: 'quick' },
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
          const catColor = filter.categoryKey ? getCategoryColor(filter.categoryKey) : null;
          const chipColor = filter.color || Colors.primary;

          // Pastel tinted backgrounds from CATEGORY_COLORS
          const activeBg = catColor
            ? (isDark ? catColor.bgDark : catColor.bg)
            : (isDark ? `${chipColor}CC` : chipColor);
          const inactiveBg = catColor
            ? (isDark ? catColor.tintDark : catColor.tint)
            : (isDark ? '#1F2937' : '#F9FAFB');
          const activeTextColor = catColor
            ? (isDark ? catColor.textDark : catColor.text)
            : '#FFFFFF';
          const inactiveTextColor = isDark ? '#9CA3AF' : '#6B7280';

          return (
            <HapticTouchableOpacity
              key={filter.id}
              onPress={() => onToggle(filter.id)}
              disabled={disabled}
              hapticStyle="light"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 100,
                backgroundColor: isActive ? activeBg : inactiveBg,
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${filter.label} filter ${isActive ? 'active' : 'inactive'}`}
            >
              {catColor && (
                <Text style={{ fontSize: 14, marginRight: 4 }}>{catColor.emoji}</Text>
              )}
              {!catColor && filter.icon && (
                <Icon
                  name={filter.icon as any}
                  size={IconSizes.XS}
                  color={isActive ? activeTextColor : inactiveTextColor}
                  accessibilityLabel=""
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? activeTextColor : (isDark ? '#D1D5DB' : '#374151'),
                }}
              >
                {filter.label}
              </Text>
              {isActive && (
                <Icon
                  name={Icons.CLOSE}
                  size={IconSizes.XS}
                  color={activeTextColor}
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
