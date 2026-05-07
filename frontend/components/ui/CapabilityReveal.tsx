// frontend/components/ui/CapabilityReveal.tsx
// ROADMAP 4.0 N6.1 — One-time capability reveal animation.
//
// When a new HX/IG/WK/N surface unlocks for a user (e.g., Pantry IQ becomes
// available after the 5th cook), this wraps the surface and fires a
// one-time tooltip + chef-kiss sparkle introducing the capability.
//
// Usage:
//   <CapabilityReveal featureKey="pantry-iq">
//     <PantryIQCard />
//   </CapabilityReveal>
//
// The reveal coordinates through `capabilityRegistry` (N6.2):
//   - The capability must be `registerCapability`-ed at boot
//   - Caps at 1 reveal per session (registry-enforced)
//   - Stored in AsyncStorage; fires exactly once per user-feature pair
//   - Auto-dismisses after AUTO_DISMISS_MS
//   - Tap-to-dismiss for keyboard / screen-reader users
//   - accessibilityRole="alert" so VoiceOver/TalkBack announce the reveal

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import {
  pickNextReveal,
  markRevealed,
  type CapabilityRegistration,
} from '../../services/capabilityRegistry';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';

const AUTO_DISMISS_MS = 5000;

export interface CapabilityRevealProps {
  /** Feature key registered via `registerCapability` at boot. */
  featureKey: string;
  /** Caller-supplied override of the auto-dismiss delay (tests + a11y). */
  autoDismissMs?: number;
  /** Suppress the reveal entirely (e.g., the host surface decided not to render). */
  enabled?: boolean;
  /** Surface this reveal is wrapping. */
  children: React.ReactNode;
}

export default function CapabilityReveal({
  featureKey,
  autoDismissMs = AUTO_DISMISS_MS,
  enabled = true,
  children,
}: CapabilityRevealProps) {
  const [registration, setRegistration] =
    useState<CapabilityRegistration | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track unmount so a timer firing after teardown doesn't markRevealed.
  const isMountedRef = useRef(true);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !featureKey) return;
    let cancelled = false;
    (async () => {
      const reg = await pickNextReveal(featureKey);
      if (cancelled || !isMountedRef.current) return;
      if (!reg) return;
      setRegistration(reg);
      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sparkleScale, {
          toValue: 1,
          damping: 12,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
      // Announce to screen readers (independent of tooltip render)
      try {
        AccessibilityInfo.announceForAccessibility?.(
          `${reg.copyShort}. ${reg.copyLong}`,
        );
      } catch {
        // best-effort
      }
      // Auto-dismiss — gated on still-mounted at fire time.
      dismissTimer.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        void handleDismiss(reg.featureKey);
      }, autoDismissMs);
    })();
    return () => {
      cancelled = true;
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, featureKey, autoDismissMs]);

  const handleDismiss = async (key: string) => {
    if (dismissed) return;
    setDismissed(true);
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
    await markRevealed(key);
  };

  const showTooltip = registration && !dismissed;

  return (
    <View testID="capability-reveal-host" style={styles.container}>
      {children}
      {showTooltip ? (
        <Animated.View
          testID="capability-reveal-tooltip"
          accessibilityRole="alert"
          accessibilityLabel={`${registration!.copyShort}. ${registration!.copyLong}`}
          accessibilityLiveRegion="polite"
          pointerEvents="box-none"
          style={[
            styles.tooltipWrap,
            { opacity },
          ]}
        >
          <Pressable
            testID="capability-reveal-dismiss"
            accessibilityRole="button"
            accessibilityLabel={`Dismiss reveal: ${registration!.copyShort}`}
            onPress={() => handleDismiss(registration!.featureKey)}
            style={[
              styles.tooltip,
              {
                backgroundColor: isDark ? PastelDark.lavender : Pastel.lavender,
                borderColor: Accent.lavender,
              },
            ]}
          >
            <Animated.Text
              testID="capability-reveal-sparkle"
              style={[
                styles.sparkle,
                { transform: [{ scale: sparkleScale }] },
              ]}
            >
              ✨
            </Animated.Text>
            <View style={styles.copyColumn}>
              <Text
                style={[
                  styles.copyShort,
                  { color: isDark ? DarkColors.text.primary : Colors.text.primary },
                ]}
              >
                {registration!.copyShort}
              </Text>
              <Text
                style={[
                  styles.copyLong,
                  { color: isDark ? DarkColors.text.secondary : Colors.text.secondary },
                ]}
                numberOfLines={3}
              >
                {registration!.copyLong}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tooltipWrap: {
    position: 'absolute',
    top: 4,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  tooltip: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'flex-start',
  },
  sparkle: {
    fontSize: 22,
    lineHeight: 26,
  },
  copyColumn: {
    flex: 1,
  },
  copyShort: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  copyLong: {
    fontSize: 12,
    lineHeight: 17,
  },
});
