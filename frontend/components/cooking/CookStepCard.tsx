// frontend/components/cooking/CookStepCard.tsx
//
// W-B2 — Cook-time UX + peak. The in-chat cook flow's glanceable surface:
// one big step at a time (readable across the kitchen), a voice control so
// hands-busy cooks talk instead of tap, and the chef-kiss peak the moment
// the last step lands. No new screen — this renders inside the Sazon chat.
//
// Designer lens: food-forward, rounded (Radius.card), elevation not borders,
// pastel surface over flat white, brand-voice copy, haptic on every press.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Brand, PastelTokens, Radius, Type, Elevation } from '../../constants/tokens';
import CookCompleteCelebration from './CookCompleteCelebration';

interface CookStepCardProps {
  stepNumber: number;
  totalSteps: number;
  text: string;
  recipeTitle: string;
  complete?: boolean;
  isListening: boolean;
  onVoicePress: () => void;
  onNext: () => void;
  onPrev?: () => void;
}

export default function CookStepCard({
  stepNumber,
  totalSteps,
  text,
  recipeTitle,
  complete = false,
  isListening,
  onVoicePress,
  onNext,
  onPrev,
}: CookStepCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // The peak: the cook is done — hand the moment over to the chef-kiss.
  if (complete) {
    return <CookCompleteCelebration tier="big" recipeTitle={recipeTitle} />;
  }

  const accent = isDark ? Brand.dark.base : Brand.light.base;
  const surface = isDark ? PastelTokens.dark.peach : PastelTokens.light.peach;
  const isLast = stepNumber >= totalSteps;
  const micLabel = isListening
    ? 'Listening — tap to stop'
    : 'Talk to Sazon while you cook';

  return (
    <View
      accessible
      accessibilityLabel={`Cooking step ${stepNumber}: ${text}`}
      style={[styles.card, { backgroundColor: surface }, Elevation.md]}
    >
      <Text style={[styles.eyebrow, { color: accent }]}>STEP {stepNumber}</Text>
      <Text style={[styles.step, isDark && styles.stepDark]}>{text}</Text>

      <View style={styles.controls}>
        <HapticTouchableOpacity
          onPress={onVoicePress}
          accessibilityRole="button"
          accessibilityLabel={micLabel}
          pressedScale={0.97}
          style={[
            styles.mic,
            { backgroundColor: isListening ? accent : 'transparent', borderColor: accent },
          ]}
        >
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={24}
            color={isListening ? '#FFFFFF' : accent}
          />
        </HapticTouchableOpacity>

        <View style={styles.navGroup}>
          {onPrev ? (
            <HapticTouchableOpacity
              onPress={onPrev}
              accessibilityRole="button"
              accessibilityLabel="Previous step"
              pressedScale={0.97}
              style={[styles.navBtn, { borderColor: accent }]}
            >
              <Text style={[styles.navGhostText, { color: accent }]}>Back</Text>
            </HapticTouchableOpacity>
          ) : null}

          <HapticTouchableOpacity
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Finish cooking' : 'Next step'}
            pressedScale={0.97}
            style={[styles.navBtn, styles.navPrimary, { backgroundColor: accent }]}
          >
            <Text style={styles.navPrimaryText}>
              {isLast ? 'Finish' : 'Next step'}
            </Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 16,
  },
  eyebrow: { ...Type.eyebrow },
  step: { ...Type.heading, color: '#1F2937' },
  stepDark: { color: '#F9FAFB' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mic: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  navPrimary: { borderWidth: 0 },
  navGhostText: { ...Type.label },
  navPrimaryText: { ...Type.label, color: '#FFFFFF' },
});
