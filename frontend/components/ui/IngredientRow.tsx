import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewProps } from 'react-native';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily } from '../../constants/Typography';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';
import { DarkColors } from '../../constants/Colors';

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const nameColor = isDark ? DarkColors.text.primary : '#111827';
  const qtyColor = isDark ? DarkColors.text.primary : '#111827';
  // Tinted icon square: amber dark / peach light
  const iconBoxBg = isDark ? 'rgba(240,185,125,0.12)' : '#FFF3E0';
  const dividerBg = isDark ? DarkColors.border.light : '#F0EAE2';

  const handlePress = () => {
    triggerHaptic('impact', ImpactStyle.light);
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
        <View style={[styles.iconBox, { backgroundColor: iconBoxBg }, checked && styles.iconBoxChecked]}>
          <Text style={styles.iconText}>{ingredient.icon}</Text>
        </View>
        <Text
          testID={testID ? `${testID}-name` : undefined}
          style={[styles.name, { color: nameColor }, checked && { textDecorationLine: 'line-through' as const }]}
        >
          {ingredient.name}
        </Text>
        <Text style={[styles.qty, { color: qtyColor }]}>{ingredient.qty}</Text>
      </Pressable>
      {showDivider && <View style={[styles.divider, { backgroundColor: dividerBg }]} />}
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
    flex: 1,
  },
  qty: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 14,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginLeft: 54,
  },
});
