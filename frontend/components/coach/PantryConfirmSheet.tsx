// Phase 5 (10Y-E): Pantry confirm sheet. After Coach extracts ingredients
// from a photo, the user picks which to add. All checked by default.

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { pantryApi, type CoachIdentifiedIngredient } from '../../lib/api';
import { emit as emitCoachAnalytics } from '../../lib/coachAnalytics';

interface PantryConfirmSheetProps {
  visible: boolean;
  ingredients: CoachIdentifiedIngredient[];
  onClose: () => void;
  onAdded?: (added: CoachIdentifiedIngredient[]) => void;
}

export default function PantryConfirmSheet({
  visible,
  ingredients,
  onClose,
  onAdded,
}: PantryConfirmSheetProps): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      const initial: Record<string, boolean> = {};
      for (const ing of ingredients) initial[ing.name] = true;
      setChecked(initial);
      emitCoachAnalytics('coach_pantry_confirm_view', {
        count: ingredients.length,
      });
    }
  }, [visible, ingredients]);

  const sheetBg = isDark ? PastelDark.sage : Pastel.sage;
  const text = isDark ? '#F5F5F5' : '#2C1810';
  const subtle = isDark ? '#C7C7C7' : '#5A4A3F';

  const toggle = (name: string) => {
    setChecked((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleAdd = async () => {
    const picked = ingredients.filter((i) => checked[i.name]);
    if (picked.length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await pantryApi.addMany(picked.map((p) => ({ name: p.name })));
      emitCoachAnalytics('coach_pantry_confirm_accept', { count: picked.length });
      onAdded?.(picked);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        accessibilityLabel="Dismiss pantry confirm sheet"
        onPress={onClose}
      />
      <View
        style={[styles.sheet, Shadows.MD as object, { backgroundColor: sheetBg }]}
        accessibilityLabel="Pantry confirm sheet"
      >
        <View style={styles.handle} />
        <Text style={[styles.headline, { color: text }]} accessibilityRole="header">
          Add these to your pantry?
        </Text>
        <Text style={[styles.subheadline, { color: subtle }]}>
          I spotted these in your photo. Uncheck anything you don't want to track.
        </Text>

        <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
          {ingredients.map((ing) => {
            const isChecked = !!checked[ing.name];
            return (
              <HapticTouchableOpacity
                key={ing.name}
                onPress={() => toggle(ing.name)}
                accessibilityLabel={`${isChecked ? 'Uncheck' : 'Check'} ${ing.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                style={styles.row}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isChecked ? '#2C1810' : 'rgba(255,255,255,0.5)',
                      borderColor: '#2C1810',
                    },
                  ]}
                >
                  {isChecked && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={[styles.rowText, { color: text }]}>{ing.name}</Text>
                <Text style={[styles.rowConf, { color: subtle }]}>
                  {Math.round(ing.confidence * 100)}%
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </ScrollView>

        <BrandButton
          label={submitting ? 'Adding...' : 'Add to pantry'}
          variant="sage"
          onPress={handleAdd}
          icon="checkmark"
          accessibilityLabel="Add to pantry"
          disabled={submitting}
        />

        <HapticTouchableOpacity
          onPress={onClose}
          accessibilityLabel="Skip"
          accessibilityRole="button"
          style={styles.skip}
        >
          <Text style={[styles.skipText, { color: subtle }]}>Skip</Text>
        </HapticTouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    gap: 16,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: 8,
  },
  headline: {
    fontFamily: Platform.select({ ios: 'Fraunces_700Bold', default: 'Fraunces_700Bold' }),
    fontSize: 22,
    lineHeight: 28,
  },
  subheadline: {
    fontFamily: Platform.select({ ios: 'PlusJakartaSans_500Medium', default: 'PlusJakartaSans_500Medium' }),
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    maxHeight: 320,
  },
  listInner: {
    gap: 8,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'PlusJakartaSans_600SemiBold', default: 'PlusJakartaSans_600SemiBold' }),
    fontSize: 15,
    textTransform: 'capitalize',
  },
  rowConf: {
    fontFamily: Platform.select({ ios: 'PlusJakartaSans_500Medium', default: 'PlusJakartaSans_500Medium' }),
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  skip: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontFamily: Platform.select({ ios: 'PlusJakartaSans_600SemiBold', default: 'PlusJakartaSans_600SemiBold' }),
    fontSize: 14,
  },
});
