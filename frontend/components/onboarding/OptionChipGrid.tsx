import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

interface OptionChip {
  id: string;
  emoji: string;
  label: string;
}

interface OptionChipGridProps {
  options: OptionChip[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  columns?: 2 | 3;
}

export function OptionChipGrid({ options, selectedIds, onToggle, columns = 3 }: OptionChipGridProps) {
  const itemWidth = columns === 3 ? '31%' : '47%';

  return (
    <View style={styles.container} testID="option-chip-grid">
      {options.map((option) => {
        const isSelected = selectedIds.has(option.id);
        return (
          <Pressable
            key={option.id}
            testID={`chip-${option.id}`}
            onPress={() => {
              triggerHaptic('impact', ImpactStyle.light);
              onToggle(option.id);
            }}
            style={[
              styles.chip,
              { width: itemWidth },
              isSelected ? styles.chipSelected : styles.chipDefault,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={option.label}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  chip: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chipDefault: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: '#E5E0DA',
  },
  chipSelected: {
    backgroundColor: 'rgba(250,126,18,0.08)',
    borderWidth: 1.5,
    borderColor: '#fa7e12',
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
    color: '#374151',
  },
  labelSelected: {
    color: '#fa7e12',
  },
});
