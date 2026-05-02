import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily } from '../../constants/Typography';
import { Colors, DarkColors, EditorialColors } from '../../constants/Colors';

interface VerticalCategoryRailProps {
  categories: string[];
  active: string;
  onSelect: (category: string) => void;
}

export function VerticalCategoryRail({ categories, active, onSelect }: VerticalCategoryRailProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const activeLabelColor = isDark ? DarkColors.text.primary : '#111827';
  const inactiveLabelColor = isDark ? DarkColors.text.tertiary : EditorialColors.fg.muted_cream;
  const dotColor = isDark ? DarkColors.primary : Colors.primary;

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {categories.map((cat) => {
        const isActive = cat === active;
        return (
          <Pressable
            key={cat}
            onPress={() => onSelect(cat)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityLabel={cat}
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.labelRow}>
              {isActive && (
                <View testID={`dot-${cat}`} style={[styles.dot, { backgroundColor: dotColor }]} />
              )}
              <Text
                style={[
                  styles.label,
                  { color: isActive ? activeLabelColor : inactiveLabelColor },
                ]}
              >
                {cat.toUpperCase()}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 78,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  item: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
});
