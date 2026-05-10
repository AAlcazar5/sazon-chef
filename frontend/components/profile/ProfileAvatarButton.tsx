// frontend/components/profile/ProfileAvatarButton.tsx
// ROADMAP 4.0 Tier A0-a — circular avatar button mounted in tab headers.
// Tap → opens ProfileSheet. Profile tab is back; the sheet now hosts
// utility / settings rows that don't have a tab home.

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import ProfileSheet from './ProfileSheet';
import BottomSheet from '../ui/BottomSheet';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel } from '../../constants/Colors';
import { Ink } from '../../constants/tokens';
import { EditorialFontFamily } from '../../constants/Typography';

// Support contact — env-overridable per the launch-checklist convention
// (mirrors PRIVACY_URL / TOS_URL in LegalLinks).
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@sazonchef.com';
const SUPPORT_SUBJECT = 'Sazon Chef — feedback';

interface ProfileAvatarButtonProps {
  /** Optional override for testing. */
  size?: number;
}

export default function ProfileAvatarButton({ size = 36 }: ProfileAvatarButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, logout } = useAuth();
  const { subscription } = useSubscription();
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  const goTo = useCallback((path: string) => {
    setOpen(false);
    router.push(path as never);
  }, []);

  const displayName = (user?.name ?? user?.email?.split('@')[0] ?? 'Friend').toString();
  const initial = displayName.slice(0, 1).toUpperCase();
  const avatarUrl = (user as { profilePicture?: string } | null | undefined)?.profilePicture ?? null;

  return (
    <>
      <HapticTouchableOpacity
        testID="profile-avatar-button"
        onPress={handleOpen}
        accessibilityLabel="Open profile menu"
        accessibilityRole="button"
        pressedScale={0.95}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            // Lavender pairs with sage Sazon + coral Quick Actions as a third
            // distinct token, and is already the "account / premium" tint in
            // the design system. Cream peach failed AA on the warm canvas.
            backgroundColor: isDark ? DarkColors.card : Pastel.lavender,
          },
        ]}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={styles.initialWrap}>
            {/* Ink-on-peach in light mode (was peach-on-peach — failed AA);
                warm ivory ink in dark mode for parity. */}
            <Text style={[styles.initial, { color: isDark ? Ink.dark.warm : Ink.light.primary }]}>
              {initial}
            </Text>
          </View>
        )}
      </HapticTouchableOpacity>

      <BottomSheet visible={open} onClose={handleClose} snapPoints={['90%']}>
        <ProfileSheet
          visible={open}
          onClose={handleClose}
          displayName={displayName}
          isPremium={Boolean(subscription?.isPremium)}
          onOpenJourney={() => goTo('/(tabs)/cookbook?view=journey')}
          onOpenMemory={() => goTo('/profile/coach-memory')}
          onOpenMembership={() => goTo('/paywall')}
          onOpenPreferences={() => goTo('/edit-preferences')}
          onOpenPantry={() => goTo('/pantry')}
          onOpenNotifications={() => {
            handleClose();
            // Notification permissions live in OS Settings — open it
            // directly (every platform exposes a per-app slot).
            Linking.openSettings().catch(() => {});
          }}
          onOpenHelp={() => {
            handleClose();
            const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}`;
            Linking.openURL(mailto).catch(() => {});
          }}
          onSignOut={async () => {
            handleClose();
            try {
              await logout();
            } catch {
              // ignored — auth screen handles errors
            }
          }}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initialWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 14,
  },
});
