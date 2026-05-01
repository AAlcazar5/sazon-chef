// frontend/components/cooking/ConsumeIngredientsSheet.tsx
// Post-cook opt-in sheet: lists the recipe's ingredients with pre-checked checkboxes.
// Confirm → POST /api/pantry/consume to decrement matching pantry items.
import { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { pantryApi } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

interface ConsumeIngredientsSheetProps {
  visible: boolean;
  ingredients: string[];
  onClose: () => void;
  onConsumed?: (result: { consumed: string[]; unmatched: string[] }) => void;
}

export default function ConsumeIngredientsSheet({
  visible,
  ingredients,
  onClose,
  onConsumed,
}: ConsumeIngredientsSheetProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Pre-checked: every ingredient selected by default
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ingredients.map((i) => [i, true])),
  );
  const [submitting, setSubmitting] = useState(false);

  const selectedIngredients = useMemo(
    () => ingredients.filter((i) => checked[i]),
    [ingredients, checked],
  );

  const toggle = (ingredient: string) => {
    Haptics.selectionAsync().catch(() => {});
    setChecked((prev) => ({ ...prev, [ingredient]: !prev[ingredient] }));
  };

  const handleConfirm = async () => {
    if (selectedIngredients.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await pantryApi.consume(selectedIngredients);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onConsumed?.(res.data);
      onClose();
    } catch {
      // Non-critical — close sheet anyway so user isn't blocked
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const bgColor = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F5F5F5' : '#1F2937';
  const accentColor = '#FFB74D';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: bgColor }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: textColor }]}>Mark ingredients as used</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            We'll remove these from your pantry so "Cook with what you have" stays accurate.
          </Text>

          <FlatList
            data={ingredients}
            keyExtractor={(item, idx) => `${item}-${idx}`}
            style={styles.list}
            renderItem={({ item }) => {
              const isChecked = !!checked[item];
              return (
                <Pressable
                  onPress={() => toggle(item)}
                  style={styles.row}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={`${item} — ${isChecked ? 'selected' : 'not selected'}`}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isChecked ? accentColor : 'transparent',
                        borderColor: isChecked ? accentColor : isDark ? '#4B5563' : '#D1D5DB',
                      },
                    ]}
                  >
                    {isChecked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.rowLabel, { color: textColor }]} numberOfLines={2}>
                    {item}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                No ingredients to track.
              </Text>
            }
          />

          <View style={styles.actions}>
            <HapticTouchableOpacity
              onPress={onClose}
              hapticStyle="light"
              accessibilityLabel="Skip"
              style={[styles.secondaryBtn, { borderColor: isDark ? '#374151' : '#E5E7EB' }]}
            >
              <Text style={[styles.secondaryLabel, { color: textColor }]}>Skip</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity
              onPress={handleConfirm}
              hapticStyle="medium"
              disabled={submitting || selectedIngredients.length === 0}
              accessibilityLabel="Mark as used"
              style={[
                styles.primaryBtn,
                { backgroundColor: accentColor, opacity: selectedIngredients.length === 0 ? 0.5 : 1 },
              ]}
            >
              <Text style={styles.primaryLabel}>
                {submitting ? 'Saving…' : `Mark ${selectedIngredients.length} as used`}
              </Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100,
    borderWidth: 1,
  },
  secondaryLabel: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
