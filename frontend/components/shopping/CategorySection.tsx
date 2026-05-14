import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EditorialFontFamily } from '../../constants/Typography';
import { ShoppingItemRow } from './ShoppingItemRow';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  inPantry: boolean;
}

interface CategorySectionProps {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  items: ShoppingItem[];
  onToggle: (id: string) => void;
}

export function CategorySection({ name, icon, iconColor, iconBg, items, onToggle }: CategorySectionProps) {
  return (
    <View style={styles.container} testID={`category-${name.toLowerCase()}`}>
      <View style={styles.header}>
        <View style={[styles.iconSquare, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <Text style={styles.categoryName}>{name.toUpperCase()}</Text>
        <Text style={styles.count}>{items.length}</Text>
      </View>
      <View style={styles.card}>
        {items.map((item, i) => (
          <ShoppingItemRow
            key={item.id}
            item={item}
            onToggle={() => onToggle(item.id)}
            showDivider={i < items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconSquare: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#111827',
    flex: 1,
  },
  count: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
    color: '#6B6B6B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
});
