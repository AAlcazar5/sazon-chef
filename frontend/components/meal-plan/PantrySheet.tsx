// frontend/components/meal-plan/PantrySheet.tsx
// ROADMAP 4.0 Tier A2-d — Pantry sheet, slides up from PantryInlineStrip.
//
// Curatorial pantry view (visual cards). Wraps existing pantry data flow.
// Tap "What can I make right now?" → routes to Build-a-Plate pantry-only mode.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export interface PantrySheetItem {
  id: string;
  name: string;
  category?: string;
}

interface PantrySheetProps {
  visible: boolean;
  onClose: () => void;
  items: PantrySheetItem[];
  loading: boolean;
  onRemoveItem: (id: string) => void;
  onWhatCanIMake: () => void;
}

/**
 * Test-friendly inline implementation. We deliberately don't import
 * `BottomSheet` here so the component renders synchronously in unit tests
 * without animation timing flakes. Mounting site (`meal-plan.tsx`) wraps
 * this in a `<BottomSheet>` for the real overlay treatment.
 */
export default function PantrySheet({
  visible,
  onClose,
  items,
  loading,
  onRemoveItem,
  onWhatCanIMake,
}: PantrySheetProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!visible) {
    return null;
  }

  const itemNoun = items.length === 1 ? 'ingredient' : 'ingredients';
  const formatName = (name: string) =>
    name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1) : name;

  return (
    <View
      testID="pantry-sheet"
      style={[
        styles.sheet,
        { backgroundColor: isDark ? DarkColors.background : Colors.background },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
            Your pantry
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary },
            ]}
          >
            {items.length === 0
              ? 'No ingredients yet — add some to get suggestions'
              : `${items.length} ${itemNoun}`}
          </Text>
        </View>
        <HapticTouchableOpacity
          onPress={onClose}
          accessibilityLabel="Close pantry"
          accessibilityRole="button"
          style={styles.closeButton}
        >
          <Ionicons
            name="close"
            size={20}
            color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
          />
        </HapticTouchableOpacity>
      </View>

      {items.length > 0 && (
        <HapticTouchableOpacity
          testID="pantry-sheet-what-can-i-make"
          onPress={onWhatCanIMake}
          accessibilityLabel="What can I make right now?"
          accessibilityRole="button"
          pressedScale={0.98}
          style={[
            styles.cta,
            { backgroundColor: isDark ? PastelDark.sage : Pastel.sage },
          ]}
        >
          <Ionicons name="sparkles" size={16} color={Accent.sage} />
          <Text style={[styles.ctaLabel, { color: Accent.sage }]}>
            What can I make right now?
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Accent.sage} />
        </HapticTouchableOpacity>
      )}

      {!loading && (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => (
            <View
              key={item.id}
              testID={`pantry-sheet-item-${item.id}`}
              style={[
                styles.itemRow,
                {
                  backgroundColor: isDark ? DarkColors.card : '#FFFFFF',
                },
              ]}
            >
              <Text
                style={[
                  styles.itemName,
                  { color: isDark ? DarkColors.text.primary : Colors.text.primary },
                ]}
                numberOfLines={1}
              >
                {formatName(item.name)}
              </Text>
              {item.category && (
                <Text
                  style={[
                    styles.itemCategory,
                    {
                      color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.category}
                </Text>
              )}
              <HapticTouchableOpacity
                testID={`pantry-sheet-remove-${item.id}`}
                onPress={() => onRemoveItem(item.id)}
                accessibilityLabel={`Remove ${item.name} from pantry`}
                accessibilityRole="button"
                style={styles.removeButton}
              >
                <Ionicons name="close" size={16} color={Accent.peach} />
              </HapticTouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 100,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  ctaLabel: {
    flex: 1,
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 12,
  },
  itemName: {
    flex: 1,
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
  },
  itemCategory: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removeButton: {
    padding: 6,
    borderRadius: 100,
  },
});
