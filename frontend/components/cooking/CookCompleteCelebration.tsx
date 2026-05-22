// frontend/components/cooking/CookCompleteCelebration.tsx
// ROADMAP 4.0 Tier J14 — Variable-reward cook-complete celebration.
//
// Three intensity tiers, resolved upstream by `cookCompleteIntensityResolver`:
//   - 'big'    → hero treatment + share prompt (extends J2 chef-kiss).
//   - 'medium' → sparkle + Sazon wink, no share prompt.
//   - 'quiet'  → light haptic + checkmark only.
//
// Anti-streak-guilt by design: not every cook is a peak. Caller decides the
// tier; this component is a pure presentation layer over the resolver's
// output. Caller wiring into `app/cooking.tsx` is deferred — the component is
// the building block, integration lands in a follow-up pass.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors, EditorialColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export type CookCompleteIntensity = 'big' | 'medium' | 'quiet';

interface CookCompleteCelebrationProps {
  tier: CookCompleteIntensity;
  recipeTitle: string;
  /**
   * Optional share callback. When provided AND tier === 'big', the
   * share-prompt becomes a tappable button that fires this. When omitted
   * the prompt is a non-interactive hint (preserves the original J14
   * presentation-only behavior).
   */
  onSharePress?: () => void;
}

const TIER_COPY: Record<CookCompleteIntensity, { headline: string; sub: string }> = {
  big: {
    headline: 'Chef’s kiss.',
    sub: 'That’s one for the kitchen.',
  },
  medium: {
    headline: 'Nice cook.',
    sub: 'Sazon noted.',
  },
  quiet: {
    headline: 'Done.',
    sub: '',
  },
};

export default function CookCompleteCelebration({
  tier,
  recipeTitle,
  onSharePress,
}: CookCompleteCelebrationProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (tier === 'quiet') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (tier === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [tier]);

  const copy = TIER_COPY[tier];
  const a11yLabel = `Cook complete: ${tier} celebration for ${recipeTitle}.`;

  if (tier === 'quiet') {
    const bg = isDark ? PastelDark.sage : Pastel.sage;
    const accent = Accent.sage;
    const text = isDark ? DarkColors.text.primary : Colors.text.primary;
    return (
      <View
        testID="cook-complete-celebration"
        accessibilityRole="summary"
        accessibilityLabel={a11yLabel}
        style={[styles.container, { backgroundColor: bg }]}
      >
        <View testID="cook-complete-celebration-quiet" style={styles.row}>
          <View
            testID="cook-complete-celebration-checkmark"
            style={[styles.checkmark, { backgroundColor: accent }]}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
          <Text style={[styles.quietHeadline, { color: text }]}>{copy.headline}</Text>
          <Text style={[styles.quietSub, { color: text }]} numberOfLines={1}>
            {recipeTitle}
          </Text>
        </View>
      </View>
    );
  }

  if (tier === 'medium') {
    const bg = isDark ? PastelDark.peach : Pastel.peach;
    const accent = Accent.peach;
    const text = isDark ? DarkColors.text.primary : Colors.text.primary;
    const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;
    return (
      <View
        testID="cook-complete-celebration"
        accessibilityRole="summary"
        accessibilityLabel={a11yLabel}
        style={[styles.container, { backgroundColor: bg }]}
      >
        <View testID="cook-complete-celebration-medium" style={styles.column}>
          <View
            testID="cook-complete-celebration-sparkle"
            style={[styles.sparkleRow, { borderColor: accent }]}
          >
            <Ionicons name="sparkles" size={14} color={accent} />
            <Text style={[styles.eyebrow, { color: accent }]}>NICE COOK</Text>
            <Ionicons name="happy-outline" size={14} color={accent} />
          </View>
          <Text style={[styles.headline, { color: text }]}>{copy.headline}</Text>
          <Text style={[styles.recipeTitle, { color: sub }]} numberOfLines={1}>
            {recipeTitle}
          </Text>
          <Text style={[styles.subline, { color: sub }]}>{copy.sub}</Text>
        </View>
      </View>
    );
  }

  // big
  const bg = isDark ? PastelDark.golden : Pastel.golden;
  // Founder ask 2026-05-21: bright Accent.golden (#FFD54F) on Pastel.golden
  // (#FFF8E1) failed contrast — eyebrow + share-prompt text was barely
  // readable. Switch to EditorialColors.pastelTitle.golden (#8a6200, WCAG
  // AA on the pale-yellow surface) in light mode; dark mode keeps the
  // bright accent because the surface is near-dark (12% golden over screen
  // bg) where a dark accent would itself fail contrast.
  const accent = isDark ? Accent.golden : EditorialColors.pastelTitle.golden;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  return (
    <View
      testID="cook-complete-celebration"
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <View testID="cook-complete-celebration-big" style={styles.column}>
        <View style={[styles.sparkleRow, { borderColor: accent }]}>
          <Ionicons name="star" size={16} color={accent} />
          <Text style={[styles.eyebrow, { color: accent }]}>CHEF&apos;S KISS</Text>
          <Ionicons name="star" size={16} color={accent} />
        </View>
        <Text style={[styles.headline, { color: text }]}>{copy.headline}</Text>
        <Text style={[styles.recipeTitle, { color: sub }]} numberOfLines={2}>
          {recipeTitle}
        </Text>
        <Text style={[styles.subline, { color: sub }]}>{copy.sub}</Text>
        {onSharePress ? (
          <HapticTouchableOpacity
            testID="cook-complete-celebration-share-prompt"
            accessibilityRole="button"
            accessibilityLabel="Send today's plate to a friend"
            onPress={onSharePress}
            hapticStyle="light"
            style={[styles.sharePrompt, { backgroundColor: 'rgba(255,255,255,0.55)' }]}
          >
            <Ionicons name="share-outline" size={14} color={accent} />
            <Text style={[styles.sharePromptLabel, { color: accent }]}>
              Send it to a friend?
            </Text>
          </HapticTouchableOpacity>
        ) : (
          <View
            testID="cook-complete-celebration-share-prompt"
            accessibilityRole="text"
            accessibilityLabel="Share today's plate is available"
            style={[styles.sharePrompt, { backgroundColor: 'rgba(255,255,255,0.55)' }]}
          >
            <Ionicons name="share-outline" size={14} color={accent} />
            <Text style={[styles.sharePromptLabel, { color: accent }]}>
              Share today&apos;s plate
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  column: {
    gap: 6,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  headline: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  quietHeadline: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  quietSub: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    flexShrink: 1,
  },
  recipeTitle: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    fontStyle: 'italic',
  },
  subline: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
  },
  sharePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    marginTop: 6,
  },
  sharePromptLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
