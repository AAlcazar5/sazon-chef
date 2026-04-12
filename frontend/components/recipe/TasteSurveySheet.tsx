// frontend/components/recipe/TasteSurveySheet.tsx
// 2-tap post-cook taste survey: emoji rating + flavor tags

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import BottomSheet from '../ui/BottomSheet';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { mealPlanApi } from '../../lib/api';

// ── Constants ────────────────────────────────────────────────────────────────

const EMOJI_SCALE = [
  { emoji: '😐', label: 'Meh', value: 1 },
  { emoji: '😕', label: 'Not great', value: 2 },
  { emoji: '😊', label: 'Good', value: 3 },
  { emoji: '😄', label: 'Great', value: 4 },
  { emoji: '🤤', label: 'Amazing', value: 5 },
] as const;

const FLAVOR_TAGS = [
  'Too bland',
  'Perfect spice',
  'Great texture',
  'Too salty',
  'Loved the sauce',
  'Kid-approved',
  'Would make again',
  'Needs more protein',
  'Too much effort',
  'Great leftovers',
] as const;

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  mealId: string | null;
  isDark: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TasteSurveySheet({ visible, mealId, isDark, onClose, onSubmitted }: Props) {
  const [tasteRating, setTasteRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const bg = isDark ? DarkColors.card : Colors.card;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  function handleEmojiSelect(value: number) {
    setTasteRating(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleTagToggle(tag: string) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else if (next.size < 3) {
        next.add(tag);
      }
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleSubmit() {
    if (!tasteRating || !mealId) return;
    setSubmitting(true);
    try {
      await mealPlanApi.submitTasteFeedback(mealId, {
        tasteRating,
        flavorTags: Array.from(selectedTags),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSubmitted?.();
      onClose();
    } catch {
      // Best-effort — don't block the user
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="How was it?"
      snapPoints={['55%']}
    >
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Q1: Emoji rating */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <Text
            style={[styles.question, { color: textPrimary }]}
            accessibilityLabel="How did it taste?"
            accessibilityRole="header"
          >
            How did it taste?
          </Text>
          <View style={styles.emojiRow}>
            {EMOJI_SCALE.map(({ emoji, label, value }) => (
              <HapticTouchableOpacity
                key={value}
                onPress={() => handleEmojiSelect(value)}
                hapticStyle="light"
                accessibilityLabel={`${label}, ${value} out of 5`}
                accessibilityRole="button"
                accessibilityState={{ selected: tasteRating === value }}
                style={[
                  styles.emojiButton,
                  {
                    backgroundColor: tasteRating === value
                      ? (isDark ? 'rgba(255,183,77,0.2)' : 'rgba(234,88,12,0.1)')
                      : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                    transform: [{ scale: tasteRating === value ? 1.15 : 1 }],
                  },
                ]}
              >
                <Text style={styles.emoji}>{emoji}</Text>
                <Text style={[styles.emojiLabel, { color: textSecondary }]}>{label}</Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </MotiView>

        {/* Q2: Flavor tags (show after rating selected) */}
        {tasteRating !== null && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 100 }}
          >
            <Text
              style={[styles.question, { color: textPrimary, marginTop: 20 }]}
              accessibilityLabel="What stood out? Select up to 3"
              accessibilityRole="header"
            >
              What stood out?{' '}
              <Text style={[styles.tagHint, { color: textSecondary }]}>up to 3</Text>
            </Text>
            <View style={styles.tagGrid}>
              {FLAVOR_TAGS.map(tag => {
                const isSelected = selectedTags.has(tag);
                return (
                  <HapticTouchableOpacity
                    key={tag}
                    onPress={() => handleTagToggle(tag)}
                    hapticStyle="light"
                    accessibilityLabel={tag}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(255,183,77,0.2)' : 'rgba(234,88,12,0.1)')
                          : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        {
                          color: isSelected
                            ? (isDark ? '#FFB74D' : '#EA580C')
                            : textSecondary,
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}
                    >
                      {tag}
                    </Text>
                  </HapticTouchableOpacity>
                );
              })}
            </View>
          </MotiView>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <BrandButton
            label={submitting ? 'Saving...' : 'Done'}
            variant="brand"
            onPress={handleSubmit}
            disabled={!tasteRating || submitting}
            accessibilityLabel="Submit taste feedback"
            style={{ flex: 1, marginRight: 8 }}
          />
          <HapticTouchableOpacity
            onPress={handleSkip}
            hapticStyle="light"
            accessibilityLabel="Skip taste survey"
            style={styles.skipButton}
          >
            <Text style={[styles.skipText, { color: textSecondary }]}>Skip</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  question: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  tagHint: {
    fontSize: 14,
    fontWeight: '400',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  emojiButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  emoji: {
    fontSize: 28,
  },
  emojiLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  tagText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
