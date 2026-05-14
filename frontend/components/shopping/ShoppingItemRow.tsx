import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { EditorialFontFamily } from '../../constants/Typography';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  inPantry: boolean;
}

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  showDivider: boolean;
}

export function ShoppingItemRow({ item, onToggle, showDivider }: ShoppingItemRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  // a11y: 10%-green-tinted bg → composited over screen lands very dark in dark
  // mode (#0A0A0A) and pale in light mode. Text must flip to maintain ≥4.5:1.
  const pantryColor = isDark ? '#4ADE80' : '#15803D';

  const handlePress = () => {
    triggerHaptic('impact', ImpactStyle.light);
    onToggle();
  };

  return (
    <>
      <Pressable
        testID={`shopping-item-${item.id}`}
        onPress={handlePress}
        style={styles.container}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={`${item.name} ${item.quantity}`}
      >
        <View
          testID={`checkbox-${item.id}`}
          style={[styles.checkbox, item.checked && styles.checkboxChecked]}
        >
          {item.checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
        <Text style={[styles.name, item.checked && styles.nameChecked]}>{item.name}</Text>
        {item.inPantry && (
          <View style={styles.pantryBadge} testID={`pantry-badge-${item.id}`}>
            <Ionicons name="checkmark-circle" size={12} color={pantryColor} />
            <Text style={[styles.pantryText, { color: pantryColor }]}>In pantry</Text>
          </View>
        )}
        <Text style={styles.quantity}>{item.quantity}</Text>
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
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#fa7e12',
    borderColor: '#fa7e12',
  },
  name: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  nameChecked: {
    opacity: 0.45,
    textDecorationLine: 'line-through',
  },
  pantryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  pantryText: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    color: '#15803D',
    textTransform: 'uppercase',
  },
  quantity: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F0EB',
    marginLeft: 34,
  },
});
