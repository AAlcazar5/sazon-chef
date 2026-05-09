// frontend/components/profile/ProfileSheet.tsx
// ROADMAP 4.0 Tier A0-b — Profile-as-sheet.
//
// Slides up from the avatar in FrostedHeader. Lightweight menu with anchors
// into existing utility flows that aren't tab-bar reachable. The "Open
// full profile" row was retired once the Profile tab returned — that row
// became a redundant nav step. Sheet now focuses on cross-cutting
// settings + secondary destinations.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Switch } from 'react-native';
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
  onOpenJourney: () => void;
  onOpenMemory: () => void;
  onOpenMembership: () => void;
  onOpenPreferences: () => void;
  onOpenPantry: () => void;
  onOpenNotifications: () => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
}

type RowTint = 'sage' | 'lavender' | 'sky' | 'peach' | 'golden' | 'blush';

interface RowProps {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  isDark: boolean;
  destructive?: boolean;
  tint?: RowTint;
}

function Row({
  testID,
  icon,
  label,
  description,
  onPress,
  isDark,
  destructive,
  tint = 'sage',
}: RowProps) {
  const labelColor = destructive ? Accent.peach : isDark ? DarkColors.text.primary : Colors.text.primary;
  const iconBg = isDark ? PastelDark[tint] : Pastel[tint];
  const iconColor = Accent[tint as keyof typeof Accent] ?? Accent.sage;
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
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
        {description && (
          <Text
            style={[
              styles.rowDescription,
              { color: isDark ? DarkColors.text.secondary : Colors.text.tertiary },
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
  onOpenJourney,
  onOpenMemory,
  onOpenMembership,
  onOpenPreferences,
  onOpenPantry,
  onOpenNotifications,
  onOpenHelp,
  onSignOut,
}: ProfileSheetProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleToggleDarkMode = React.useCallback(() => {
    void toggleTheme();
  }, [toggleTheme]);

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
        {/* Activity — destinations the tab bar doesn't surface directly. */}
        <Row
          testID="profile-sheet-row-journey"
          icon="map-outline"
          label="Cooking journey"
          description="Cuisines, plates, skill tier"
          onPress={onOpenJourney}
          isDark={isDark}
          tint="sage"
        />
        <Row
          testID="profile-sheet-row-memory"
          icon="bookmark-outline"
          label="Sazon memory"
          description={isPremium ? 'What I remember about you' : 'Sazon Membership feature'}
          onPress={onOpenMemory}
          isDark={isDark}
          tint="peach"
        />

        {/* Configure — frequent cross-cutting settings. Membership routes
            to the paywall / management screen; Preferences edits dietary,
            allergens, cuisine prefs. */}
        <Row
          testID="profile-sheet-row-membership"
          icon={isPremium ? 'sparkles' : 'sparkles-outline'}
          label="Membership"
          description={isPremium ? 'Manage your subscription' : 'Upgrade to Sazon Membership'}
          onPress={onOpenMembership}
          isDark={isDark}
          tint="lavender"
        />
        <Row
          testID="profile-sheet-row-preferences"
          icon="options-outline"
          label="Preferences"
          description="Allergens, dietary, cuisine"
          onPress={onOpenPreferences}
          isDark={isDark}
          tint="sky"
        />
        <Row
          testID="profile-sheet-row-pantry"
          icon="basket-outline"
          label="Pantry"
          description="What's in your kitchen"
          onPress={onOpenPantry}
          isDark={isDark}
          tint="sage"
        />

        {/* Utility — system + support entry points. Notifications routes
            to OS Settings (where notification permissions actually live);
            Help opens the support email pre-filled. */}
        <Row
          testID="profile-sheet-row-notifications"
          icon="notifications-outline"
          label="Notifications"
          description="Reminders, alerts, push"
          onPress={onOpenNotifications}
          isDark={isDark}
          tint="blush"
        />
        <Row
          testID="profile-sheet-row-help"
          icon="help-circle-outline"
          label="Help & feedback"
          description="Contact support, report a bug"
          onPress={onOpenHelp}
          isDark={isDark}
          tint="golden"
        />

        {/* Dark-mode toggle — tap row OR switch flips theme. */}
        <HapticTouchableOpacity
          testID="profile-sheet-row-dark-mode"
          onPress={handleToggleDarkMode}
          accessibilityRole="switch"
          accessibilityLabel="Dark mode"
          pressedScale={0.98}
          style={[
            styles.row,
            { backgroundColor: isDark ? DarkColors.card : '#FFFFFF' },
          ]}
        >
          <View
            style={[
              styles.rowIcon,
              { backgroundColor: isDark ? PastelDark.golden : Pastel.golden },
            ]}
          >
            <Ionicons
              name={isDark ? 'moon' : 'moon-outline'}
              size={18}
              color={Accent.golden}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
              Dark mode
            </Text>
            <Text
              style={[
                styles.rowDescription,
                { color: isDark ? DarkColors.text.secondary : Colors.text.tertiary },
              ]}
              numberOfLines={1}
            >
              {isDark ? 'On' : 'Off'}
            </Text>
          </View>
          <Switch
            testID="profile-sheet-dark-mode-switch"
            value={isDark}
            onValueChange={handleToggleDarkMode}
            accessibilityLabel="Toggle dark mode"
            trackColor={{ false: '#E5E7EB', true: Accent.lavender }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E7EB"
          />
        </HapticTouchableOpacity>

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
          tint="peach"
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
  // Tighter rhythm: rows touch (gap 0). Each row keeps its rounded
  // corners so the stack reads as a coherent column of cards rather than
  // floating at intervals.
  menu: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
    marginBottom: 2,
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
    marginVertical: 10,
    marginHorizontal: 8,
  },
});
