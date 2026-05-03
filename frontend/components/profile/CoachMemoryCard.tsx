// Phase 6 (10Y-C): Profile entry into Sazon Coach memory + weekly check-in toggle.
// Free users see a lock icon + Pro badge; tapping the toggle opens the paywall.
// Pro users tap through to the full coach-memory screen and toggle the check-in on/off.

import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import SettingsRow from '../ui/SettingsRow';
import Icon from '../ui/Icon';
import CoachPaywallSheet, {
  type CoachPaywallReason,
} from '../coach/CoachPaywallSheet';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../hooks/useSubscription';
import { userApi } from '../../lib/api';

interface CoachMemoryCardProps {
  initialWeeklyCheckin?: boolean;
}

export default function CoachMemoryCard({
  initialWeeklyCheckin = false,
}: CoachMemoryCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { subscription } = useSubscription();
  const isPro =
    subscription.isPremium === true && subscription.tier === 'premium';

  const [paywallReason, setPaywallReason] = useState<CoachPaywallReason | null>(
    null,
  );
  const [weeklyCheckin, setWeeklyCheckin] = useState(initialWeeklyCheckin);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setWeeklyCheckin(initialWeeklyCheckin);
  }, [initialWeeklyCheckin]);

  const onPressMemory = () => {
    router.push('/profile/coach-memory' as never);
  };

  const onToggleCheckin = async (next: boolean) => {
    if (!isPro) {
      setPaywallReason('weekly_checkin');
      return;
    }
    setUpdating(true);
    setWeeklyCheckin(next);
    try {
      await userApi.updateMyPreferences({ weeklyCheckinOptIn: next });
    } catch {
      // Revert UI on failure; backend remains source of truth.
      setWeeklyCheckin(!next);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        Shadows.MD as object,
        { backgroundColor: isDark ? DarkColors.surface : '#FFFFFF' },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isDark ? PastelDark.lavender : Pastel.lavender,
            },
          ]}
        >
          <Ionicons
            name="bookmark"
            size={20}
            color={isDark ? '#CE93D8' : '#5E35B1'}
          />
        </View>
        <Text
          style={[
            styles.headerText,
            { color: isDark ? DarkColors.text.primary : Colors.text.primary },
          ]}
        >
          Sazon Coach
        </Text>
      </View>

      <SettingsRow
        label="Coach memory"
        sublabel={
          isPro
            ? "What Sazon's learned about your kitchen"
            : 'Pro Coach remembers across chats'
        }
        icon={
          <Icon
            name={Icons.BOOKMARK_OUTLINE}
            size={IconSizes.MD}
            color={isDark ? '#9CA3AF' : '#6B7280'}
            accessibilityLabel="Coach memory"
          />
        }
        rightElement={
          !isPro ? (
            <View style={styles.lockWrap}>
              <Ionicons
                name="lock-closed"
                size={14}
                color={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </View>
          ) : undefined
        }
        onPress={onPressMemory}
        testID="coach-memory-row"
      />

      <SettingsRow
        label="Weekly check-in (Pro)"
        sublabel="Sazon DMs you Sundays with adjustments based on this week"
        icon={
          <Icon
            name={Icons.NOTIFICATIONS_OUTLINE}
            size={IconSizes.MD}
            color={isDark ? '#9CA3AF' : '#6B7280'}
            accessibilityLabel="Weekly check-in"
          />
        }
        rightElement={
          isPro ? (
            <Switch
              value={weeklyCheckin}
              onValueChange={onToggleCheckin}
              disabled={updating}
              accessibilityLabel="Weekly check-in toggle"
              trackColor={{
                false: '#D1D5DB',
                true: isDark ? DarkColors.primary : Colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          ) : (
            <HapticTouchableOpacity
              onPress={() => setPaywallReason('weekly_checkin')}
              accessibilityLabel="Weekly check-in (Pro)"
              accessibilityRole="button"
              style={[
                styles.proBadge,
                {
                  backgroundColor: isDark ? PastelDark.golden : Pastel.golden,
                },
              ]}
            >
              <Ionicons
                name="star"
                size={11}
                color={isDark ? '#FFD54F' : '#F57F17'}
              />
              <Text
                style={[
                  styles.proBadgeText,
                  { color: isDark ? '#FFD54F' : '#F57F17' },
                ]}
              >
                Pro
              </Text>
            </HapticTouchableOpacity>
          )
        }
        onPress={!isPro ? () => setPaywallReason('weekly_checkin') : undefined}
        showBorder={false}
        testID="weekly-checkin-row"
      />

      <CoachPaywallSheet
        visible={paywallReason !== null}
        reason={paywallReason ?? 'generic'}
        onClose={() => setPaywallReason(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    margin: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: Platform.select({
      ios: 'Fraunces_700Bold',
      default: 'Fraunces_700Bold',
    }),
    fontSize: 18,
  },
  lockWrap: {
    paddingHorizontal: 4,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  proBadgeText: {
    fontFamily: Platform.select({
      ios: 'PlusJakartaSans_700Bold',
      default: 'PlusJakartaSans_700Bold',
    }),
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
