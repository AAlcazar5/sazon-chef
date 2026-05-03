// Phase 4 (10Y-D): Coach paywall — slide-up bottom sheet with Pro benefits +
// reason-specific headline. Replaces the inline placeholder card in coach.tsx.

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { emit as emitCoachAnalytics } from '../../lib/coachAnalytics';

export type CoachPaywallReason =
  | 'cap'
  | 'photos'
  | 'memory'
  | 'weekly_checkin'
  | 'generic';

interface CoachPaywallSheetProps {
  visible: boolean;
  reason: CoachPaywallReason;
  onClose: () => void;
}

const HEADLINES: Record<CoachPaywallReason, string> = {
  cap: "You're on a roll — Pro Coach has no daily cap.",
  photos: 'Snap your fridge → get plate ideas. Pro Coach unlocks photos.',
  memory: 'Pro Coach remembers what worked. Free starts fresh every chat.',
  weekly_checkin:
    'Pro Coach checks in every week and adapts. Unlock weekly check-ins.',
  generic: 'Unlock the real Sazon Coach',
};

const BENEFITS: ReadonlyArray<{ icon: 'sparkles' | 'infinite' | 'heart'; text: string }> = [
  { icon: 'sparkles', text: 'Opus + extended thinking — Sazon’s deepest reasoning model.' },
  { icon: 'infinite', text: 'Unlimited messages, every day. No daily cap.' },
  { icon: 'heart', text: 'Persistent memory + photos + weekly check-ins.' },
];

export default function CoachPaywallSheet({
  visible,
  reason,
  onClose,
}: CoachPaywallSheetProps) {
  const { startCheckout } = useSubscription();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (visible) {
      emitCoachAnalytics('coach_paywall_view', { reason });
    }
  }, [visible, reason]);

  const handleUpgrade = () => {
    emitCoachAnalytics('coach_paywall_convert', { reason });
    startCheckout('month');
  };

  const sheetBg = isDark ? PastelDark.blush : Pastel.blush;
  const accentBg = isDark ? PastelDark.sage : Pastel.sage;
  const text = isDark ? '#F5F5F5' : '#2C1810';
  const subtle = isDark ? '#C7C7C7' : '#5A4A3F';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        accessibilityLabel="Dismiss Coach paywall"
        onPress={onClose}
      />
      <View
        style={[styles.sheet, Shadows.MD as object, { backgroundColor: sheetBg }]}
        accessibilityLabel="Coach paywall sheet"
      >
        <View style={styles.handle} />

        <Text style={[styles.headline, { color: text }]} accessibilityRole="header">
          {HEADLINES[reason]}
        </Text>

        <Text style={[styles.subheadline, { color: subtle }]}>
          {reason === 'generic' ? '' : "Here's what you'd unlock."}
        </Text>

        <View style={[styles.benefits, { backgroundColor: accentBg }]}>
          {BENEFITS.map(b => (
            <View key={b.icon} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon} size={18} color={isDark ? '#fff' : '#2C1810'} />
              </View>
              <Text style={[styles.benefitText, { color: text }]}>{b.text}</Text>
            </View>
          ))}
        </View>

        <BrandButton
          label="Upgrade to Pro"
          variant="brand"
          onPress={handleUpgrade}
          icon="star"
          accessibilityLabel="Upgrade to Pro"
        />

        <HapticTouchableOpacity
          onPress={onClose}
          accessibilityLabel="Maybe later"
          accessibilityRole="button"
          style={styles.maybeLater}
        >
          <Text style={[styles.maybeLaterText, { color: subtle }]}>Maybe later</Text>
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
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'left',
  },
  subheadline: {
    fontFamily: Platform.select({ ios: 'PlusJakartaSans_500Medium', default: 'PlusJakartaSans_500Medium' }),
    fontSize: 14,
    lineHeight: 20,
  },
  benefits: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  benefitText: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'PlusJakartaSans_500Medium', default: 'PlusJakartaSans_500Medium' }),
    fontSize: 14,
    lineHeight: 20,
  },
  maybeLater: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  maybeLaterText: {
    fontFamily: Platform.select({ ios: 'PlusJakartaSans_600SemiBold', default: 'PlusJakartaSans_600SemiBold' }),
    fontSize: 14,
  },
});
