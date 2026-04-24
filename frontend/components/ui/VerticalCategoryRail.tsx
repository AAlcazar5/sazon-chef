import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialColors } from '../../constants/Colors';

interface VerticalCategoryRailProps {
  categories: string[];
  active: string;
  onSelect: (category: string) => void;
}

export function VerticalCategoryRail({ categories, active, onSelect }: VerticalCategoryRailProps) {
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
                <View testID={`dot-${cat}`} style={styles.dot} />
              )}
              <Text
                style={[
                  styles.label,
                  { color: isActive ? '#111827' : EditorialColors.fg.muted_cream },
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
    backgroundColor: '#fa7e12',
    marginRight: 6,
  },
  label: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
});
