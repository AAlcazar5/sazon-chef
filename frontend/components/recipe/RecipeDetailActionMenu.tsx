// frontend/components/recipe/RecipeDetailActionMenu.tsx
// ROADMAP 4.0 RD1.1 — secondary actions on the recipe-detail screen.
//
// Replaces the stacked Vary / Edit composition / Export menu PDF buttons
// with a single ellipsis trigger that opens a small bottom sheet. Keeps
// AskSazonAboutRecipePill as the sole primary CTA so the conversion focus
// stays sharp.

import React, { useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { track } from '../../lib/analytics';

export interface RecipeDetailActionMenuProps {
  /** Whether this recipe is a user-composed plate. Hides composed-only rows. */
  isComposed: boolean;
  /** Whether the export-as-menu-PDF row is available
   *  (composed AND backend supplied a plate payload). */
  canExportMenu: boolean;
  onEditComposition?: () => void;
  onVaryThisPlate?: () => void;
  onExportMenu?: () => void;
  onShare?: () => void;
  onSaveToCollection?: () => void;
}

interface MenuRow {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  show: boolean;
}

export default function RecipeDetailActionMenu({
  isComposed,
  canExportMenu,
  onEditComposition,
  onVaryThisPlate,
  onExportMenu,
  onShare,
  onSaveToCollection,
}: RecipeDetailActionMenuProps) {
  const [open, setOpen] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const triggerBg = isDark ? PastelDark.lavender : Pastel.lavender;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const sheetBg = isDark ? DarkColors.background : '#FAF7F4';
  const rowBg = isDark ? '#2A1F1A' : '#FFFFFF';

  const close = () => setOpen(false);

  const rows: MenuRow[] = [
    {
      id: 'edit',
      icon: 'create-outline',
      label: 'Edit composition',
      show: isComposed && !!onEditComposition,
      onPress: () => {
        close();
        onEditComposition?.();
      },
    },
    {
      id: 'vary',
      icon: 'shuffle-outline',
      label: 'Vary this plate',
      show: isComposed && !!onVaryThisPlate,
      onPress: () => {
        close();
        onVaryThisPlate?.();
      },
    },
    {
      id: 'export',
      icon: 'document-text-outline',
      label: 'Export as menu PDF',
      show: canExportMenu && !!onExportMenu,
      onPress: () => {
        close();
        onExportMenu?.();
      },
    },
    {
      id: 'share',
      icon: 'share-outline',
      label: 'Share',
      show: !!onShare,
      onPress: () => {
        close();
        onShare?.();
      },
    },
    {
      id: 'save',
      icon: 'bookmark-outline',
      label: 'Save to collection',
      show: !!onSaveToCollection,
      onPress: () => {
        close();
        onSaveToCollection?.();
      },
    },
  ].filter((r) => r.show);

  if (rows.length === 0) return null;

  return (
    <View>
      <HapticTouchableOpacity
        testID="recipe-detail-action-menu-trigger"
        accessibilityRole="button"
        accessibilityLabel="More actions"
        onPress={() => {
          HapticPatterns.buttonPress();
          // RD7.1 — telemetry: menu_open fires once per session per detail
          // visit (component-level open flips false → true).
          track('recipe_detail_menu_open');
          setOpen(true);
        }}
        style={[styles.trigger, { backgroundColor: triggerBg }]}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={text} />
      </HapticTouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <Pressable
          testID="recipe-detail-action-menu-backdrop"
          style={styles.backdrop}
          onPress={close}
        >
          <Pressable
            testID="recipe-detail-action-menu-sheet"
            onPress={(e) => e.stopPropagation()}
            style={[styles.sheet, { backgroundColor: sheetBg }]}
          >
            <View style={styles.handle} />
            {rows.map((row) => (
              <HapticTouchableOpacity
                key={row.id}
                testID={`recipe-detail-action-menu-row-${row.id}`}
                accessibilityRole="button"
                accessibilityLabel={row.label}
                onPress={row.onPress}
                style={[styles.row, { backgroundColor: rowBg }]}
              >
                <Ionicons name={row.icon} size={20} color={subtle} style={styles.rowIcon} />
                <Text style={[styles.rowLabel, { color: text }]}>{row.label}</Text>
              </HapticTouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
