import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewProps } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

interface Ingredient {
  name: string;
  qty: string;
  icon: string;
}

interface IngredientRowProps extends ViewProps {
  ingredient: Ingredient;
  checked: boolean;
  onToggle: () => void;
  showDivider?: boolean;
}

export function IngredientRow({ ingredient, checked, onToggle, showDivider = true, testID, ...props }: IngredientRowProps) {
  const handlePress = () => {
    triggerHaptic(ImpactStyle.LIGHT);
    onToggle();
  };

  return (
    <>
      <Pressable
        testID={testID}
        onPress={handlePress}
        style={[styles.container, checked && { opacity: 0.45 }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${ingredient.name} ${ingredient.qty}`}
        {...props}
      >
        <View style={[styles.iconBox, checked && styles.iconBoxChecked]}>
          <Text style={styles.iconText}>{ingredient.icon}</Text>
        </View>
        <Text
          testID={testID ? `${testID}-name` : undefined}
          style={[styles.name, checked && { textDecorationLine: 'line-through' as const }]}
        >
          {ingredient.name}
        </Text>
        <Text style={styles.qty}>{ingredient.qty}</Text>
      </Pressable>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBoxChecked: {
    opacity: 0.5,
  },
  iconText: {
    fontSize: 20,
  },
  name: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  qty: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EAE2',
    marginLeft: 54,
  },
});
