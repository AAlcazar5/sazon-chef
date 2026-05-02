import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily } from '../../constants/Typography';
import { DarkColors } from '../../constants/Colors';
import { UnitSegmentedControl } from '../ui/UnitSegmentedControl';
import { ServingStepper } from '../ui/ServingStepper';
import { IngredientRow } from '../ui/IngredientRow';

interface Ingredient {
  name: string;
  qty: string;
  icon: string;
}

interface EditorialIngredientsProps {
  ingredients: Ingredient[];
  servings: number;
  onChangeServings: (value: number) => void;
  unit: 'Metric' | 'US';
  onChangeUnit: (value: 'Metric' | 'US') => void;
}

export function EditorialIngredients({
  ingredients,
  servings,
  onChangeServings,
  unit,
  onChangeUnit,
}: EditorialIngredientsProps) {
  const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set());

  const toggleChecked = (index: number) => {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const titleColor = isDark ? DarkColors.text.primary : '#111827';

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: titleColor }]}>Ingredients</Text>

      <View style={styles.controls}>
        <UnitSegmentedControl value={unit} onChange={onChangeUnit} />
        <ServingStepper servings={servings} onChangeServings={onChangeServings} />
      </View>

      <View style={styles.list}>
        {ingredients.map((ingredient, i) => (
          <IngredientRow
            key={i}
            testID={`ingredient-${i}`}
            ingredient={ingredient}
            checked={checkedSet.has(i)}
            onToggle={() => toggleChecked(i)}
            showDivider={i < ingredients.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  list: {
    marginTop: 8,
  },
});
