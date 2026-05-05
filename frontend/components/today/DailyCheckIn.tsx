// frontend/components/today/DailyCheckIn.tsx
// ROADMAP 4.0 Tier C7 frontend — Daily check-in.
//
// 3-tap, 10s max. One emoji-Likert question (hunger), one free-text
// reflection. Skip-friendly. The data + reflection pair is the highest-
// fidelity adaptation signal in the personalization stack.

import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { dailyCheckInApi } from '../../lib/api';

interface DailyCheckInProps {
  visible: boolean;
  onClose: () => void;
}

const HUNGER_EMOJI = ['😴', '🙂', '😐', '🍽', '😋'];
const REFLECTION_MAX = 500;

export default function DailyCheckIn({ visible, onClose }: DailyCheckInProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hungerNow, setHungerNow] = useState<number | null>(null);
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await dailyCheckInApi.upsert({
        date: new Date().toISOString(),
        hungerNow: hungerNow ?? undefined,
        reflectionText: reflection.length > 0 ? reflection : undefined,
      });
    } catch {
      // Best-effort — telemetry never blocks UX.
    } finally {
      setSaving(false);
      onClose();
    }
  }, [hungerNow, reflection, onClose]);

  if (!visible) {
    return null;
  }

  return (
    <View
      testID="daily-check-in"
      style={[
        styles.card,
        { backgroundColor: isDark ? PastelDark.blush : Pastel.blush },
      ]}
    >
      <Text style={[styles.eyebrow, { color: Accent.blush }]}>QUICK CHECK-IN</Text>
      <Text
        style={[
          styles.prompt,
          { color: isDark ? DarkColors.text.primary : Colors.text.primary },
        ]}
      >
        How hungry are you right now?
      </Text>
      <View style={styles.likertRow}>
        {HUNGER_EMOJI.map((emoji, i) => {
          const value = i + 1;
          const selected = hungerNow === value;
          return (
            <HapticTouchableOpacity
              key={emoji}
              testID={`hunger-option-${value}`}
              onPress={() => setHungerNow(value)}
              accessibilityLabel={`Hunger ${value} of 5`}
              accessibilityRole="button"
              pressedScale={0.92}
              style={[
                styles.likertChip,
                {
                  backgroundColor: selected
                    ? Accent.blush
                    : isDark
                    ? 'rgba(255,255,255,0.18)'
                    : 'rgba(255,255,255,0.6)',
                },
              ]}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </HapticTouchableOpacity>
          );
        })}
      </View>

      <TextInput
        testID="reflection-input"
        value={reflection}
        onChangeText={setReflection}
        placeholder="How was the meal? Anything you'd change?"
        placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
        multiline
        maxLength={REFLECTION_MAX}
        style={[
          styles.input,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)',
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          },
        ]}
      />

      <View style={styles.buttonRow}>
        <HapticTouchableOpacity
          testID="daily-check-in-skip"
          onPress={onClose}
          accessibilityLabel="Skip check-in"
          accessibilityRole="button"
          pressedScale={0.97}
          style={styles.skipButton}
        >
          <Text style={[styles.skipLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
            Skip
          </Text>
        </HapticTouchableOpacity>
        <HapticTouchableOpacity
          testID="daily-check-in-save"
          onPress={handleSave}
          accessibilityLabel="Save check-in"
          accessibilityRole="button"
          pressedScale={0.97}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: Accent.blush }]}
        >
          <Text style={styles.saveLabel}>Save</Text>
        </HapticTouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  prompt: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  likertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  likertChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  input: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  skipLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
  saveButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
  },
  saveLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
