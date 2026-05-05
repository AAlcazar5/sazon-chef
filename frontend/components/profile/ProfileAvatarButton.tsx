// frontend/components/profile/ProfileAvatarButton.tsx
// ROADMAP 4.0 Tier A0-a — circular avatar button mounted in tab headers.
// Tap → opens ProfileSheet. Replaces the Profile tab.

import React, { useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import ProfileSheet from './ProfileSheet';
import BottomSheet from '../ui/BottomSheet';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

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
            backgroundColor: isDark ? DarkColors.card : Pastel.peach,
          },
        ]}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          />
        ) : (
          <View style={styles.initialWrap}>
            <Text style={[styles.initial, { color: Accent.peach }]}>{initial}</Text>
          </View>
        )}
      </HapticTouchableOpacity>

      <BottomSheet visible={open} onClose={handleClose} snapPoints={['90%']}>
        <ProfileSheet
          visible={open}
          onClose={handleClose}
          displayName={displayName}
          isPremium={Boolean(subscription?.isPremium)}
          onOpenFullProfile={() => goTo('/(tabs)/profile')}
          onOpenMacros={() => goTo('/(tabs)/profile?focus=macros')}
          onOpenJourney={() => goTo('/(tabs)/profile?focus=journey')}
          onOpenMemory={() => goTo('/(tabs)/profile?focus=memory')}
          onOpenNotifications={() => goTo('/(tabs)/profile?focus=notifications')}
          onOpenAppearance={() => goTo('/(tabs)/profile?focus=appearance')}
          onOpenAccount={() => goTo('/(tabs)/profile?focus=account')}
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
