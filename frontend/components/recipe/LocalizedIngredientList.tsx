// frontend/components/recipe/LocalizedIngredientList.tsx
// ROADMAP 4.0 I2.2 — Recipe rendering uses local equivalents.
//
// Presentational component. Takes the canonical (English) ingredient
// strings + a user locale, renders the locale-appropriate display name
// per row + a substitute hint inline when availability tier !== 'common'.
//
// Recipe text in the DB stays canonical — this is a presentation-layer
// concern. en-US locales render unchanged (regression-safe path).
//
// Why a separate component (vs editing IngredientChecklist):
//   - IngredientChecklist owns cooking-mode chrome (servings counter,
//     check-off, animations). I2.2 is read-only display logic.
//   - Future Build-a-Plate slot UI consumes the same localizer; this
//     component is the canonical surface for it.
//   - Avoids regression risk against the existing checklist tests.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { localizeIngredientText } from '../../lib/ingredientLocal';

interface LocalizedIngredientListProps {
  /** Freeform ingredient lines, e.g. ["2 cups kale, chopped"]. */
  ingredients: ReadonlyArray<string>;
  /** BCP 47 locale tag. 'en-US' renders unchanged. */
  locale: string;
}

export const LocalizedIngredientList: React.FC<LocalizedIngredientListProps> = ({
  ingredients,
  locale,
}) => {
  return (
    <View testID="localized-ingredient-list">
      {ingredients.map((line, i) => {
        const r = localizeIngredientText(line, locale);
        const showSub = r.availabilityTier !== 'common' && r.substitute;
        return (
          <View key={i} style={styles.row} testID={`ingredient-row-${i}`}>
            <Text style={styles.line} testID={`ingredient-line-${i}`}>
              {r.localized}
            </Text>
            {showSub && (
              <Text
                style={styles.substitute}
                testID={`ingredient-substitute-${i}`}
                accessibilityLabel={`Substitute: ${r.substitute}`}
              >
                or sub: {r.substitute}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingVertical: 6,
  },
  line: {
    fontSize: 16,
    color: '#1F1B16',
    lineHeight: 22,
  },
  substitute: {
    fontSize: 13,
    color: '#665E55',
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default LocalizedIngredientList;
