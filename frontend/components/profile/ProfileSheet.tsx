// frontend/components/profile/ProfileSheet.tsx
// ROADMAP 4.0 Tier A0-b — Profile-as-sheet.
//
// Slides up from the avatar in FrostedHeader. Lightweight menu with anchors
// into the existing profile sections (rendered in /(tabs)/profile when
// "Profile" is tapped). Avoids duplicating the profile screen's
// data hooks inside the sheet.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import LegalLinks from './LegalLinks';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  displayName: string;
  isPremium: boolean;
  onOpenFullProfile: () => void;
  onOpenJourney: () => void;
  onOpenMemory: () => void;
  onSignOut: () => void;
}

interface RowProps {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  isDark: boolean;
  destructive?: boolean;
}

function Row({ testID, icon, label, description, onPress, isDark, destructive }: RowProps) {
  const labelColor = destructive ? Accent.peach : isDark ? DarkColors.text.primary : Colors.text.primary;
  return (
    <HapticTouchableOpacity
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      pressedScale={0.98}
      style={[
        styles.row,
        { backgroundColor: isDark ? DarkColors.card : '#FFFFFF' },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: isDark ? PastelDark.sage : Pastel.sage },
        ]}
      >
        <Ionicons name={icon} size={18} color={Accent.sage} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
        {description && (
          <Text
            style={[
              styles.rowDescription,
              { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary },
            ]}
            numberOfLines={1}
          >
            {description}
          </Text>
        )}
      </View>
      {!destructive && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
        />
      )}
    </HapticTouchableOpacity>
  );
}

export default function ProfileSheet({
  visible,
  onClose,
  displayName,
  isPremium,
  onOpenFullProfile,
  onOpenJourney,
  onOpenMemory,
  onSignOut,
}: ProfileSheetProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!visible) {
    return null;
  }

  const tierBadge = isPremium ? 'Sazon Membership' : 'Free';
  const tierTint = isPremium ? Accent.lavender : Accent.golden;
  const tierBg = isDark
    ? isPremium
      ? PastelDark.lavender
      : PastelDark.golden
    : isPremium
    ? Pastel.lavender
    : Pastel.golden;

  return (
    <View
      testID="profile-sheet"
      style={[
        styles.sheet,
        { backgroundColor: isDark ? DarkColors.background : Colors.background },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text
            style={[
              styles.name,
              { color: isDark ? DarkColors.text.primary : Colors.text.primary },
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <View style={[styles.badge, { backgroundColor: tierBg }]}>
            <Text style={[styles.badgeLabel, { color: tierTint }]}>{tierBadge}</Text>
          </View>
        </View>
        <HapticTouchableOpacity
          testID="profile-sheet-close"
          onPress={onClose}
          accessibilityLabel="Close profile menu"
          accessibilityRole="button"
          style={styles.closeButton}
        >
          <Ionicons
            name="close"
            size={20}
            color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
          />
        </HapticTouchableOpacity>
      </View>

      <ScrollView
        testID="profile-sheet-menu"
        accessibilityRole="menu"
        contentContainerStyle={styles.menu}
        showsVerticalScrollIndicator={false}
      >
        {/* Tier A0-b cleanup: Macros, Notifications, Appearance, and
            Account & privacy rows used to live here. All four routed to
            /(tabs)/profile?focus=<thing> with a `?focus=` param the screen
            never read — making them functional duplicates of "Open full
            profile". Removed; their corresponding cards still live on the
            full profile screen. */}
        <Row
          testID="profile-sheet-row-journey"
          icon="map-outline"
          label="Cooking journey"
          description="Cuisines, plates, skill tier"
          onPress={onOpenJourney}
          isDark={isDark}
        />
        <Row
          testID="profile-sheet-row-memory"
          icon="bookmark-outline"
          label="Sazon memory"
          description={isPremium ? 'What I remember about you' : 'Sazon Membership feature'}
          onPress={onOpenMemory}
          isDark={isDark}
        />
        <Row
          testID="profile-sheet-row-full-profile"
          icon="open-outline"
          label="Profile"
          description="All settings + history"
          onPress={onOpenFullProfile}
          isDark={isDark}
        />

        <View style={styles.divider} />

        <LegalLinks />

        <View style={styles.divider} />

        <Row
          testID="profile-sheet-sign-out"
          icon="log-out-outline"
          label="Sign out"
          onPress={onSignOut}
          isDark={isDark}
          destructive
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: 6,
    borderRadius: 100,
  },
  menu: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
  },
  rowDescription: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 12,
    marginHorizontal: 8,
  },
});
