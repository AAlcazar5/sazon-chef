import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Colors, DarkColors } from '../../constants/Colors';
import { LogoMascot } from '../mascot';
import Sazon from '../mascot/Sazon';

interface EditorialGreetingProps {
  userName?: string;
  onSearchPress: () => void;
  onNotificationsPress: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

function getHeadlineWord(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning's";
  if (hour < 17) return "Today's";
  return "Tonight's";
}

export function EditorialGreeting({ userName, onSearchPress, onNotificationsPress }: EditorialGreetingProps) {
  const greeting = getGreeting();
  const headlineWord = getHeadlineWord();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const titleColor = isDark ? DarkColors.text.primary : '#111827';
  const periodColor = isDark ? DarkColors.primary : Colors.primary;
  const eyebrowColor = isDark ? DarkColors.text.tertiary : '#9CA3AF';
  const subtitleColor = isDark ? DarkColors.text.secondary : '#9CA3AF';
  const iconBg = isDark ? DarkColors.card : '#FFFFFF';
  const iconColor = isDark ? DarkColors.text.primary : '#111827';

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.greetingRow}>
          <Sazon variant="orange" motion="idle" size={36} />
          <View style={styles.greetingText}>
            <Text style={[styles.eyebrow, { color: eyebrowColor }]}>{greeting}</Text>
            {userName && <Text style={[styles.userName, { color: titleColor }]}>Hi, {userName}</Text>}
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            testID="search-button"
            onPress={onSearchPress}
            style={[styles.iconButton, { backgroundColor: iconBg }]}
            accessibilityLabel="Search"
            accessibilityRole="button"
          >
            <Ionicons name="search" size={20} color={iconColor} />
          </Pressable>
          <Pressable
            testID="notifications-button"
            onPress={onNotificationsPress}
            style={[styles.iconButton, { backgroundColor: iconBg }]}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={20} color={iconColor} />
          </Pressable>
        </View>
      </View>

      {/* Editorial headline */}
      <View style={styles.headline}>
        <Text style={[styles.displayText, { color: titleColor }]}>
          {headlineWord}{' '}
          <Text style={[styles.displayAccent, { color: titleColor }]}>picks</Text>
        </Text>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>
          Crafted around what's in your pantry and today's macro budget.
        </Text>
      </View>
    </View>
  );
}

// Export for testing
export { getGreeting, getHeadlineWord };

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingText: {
    gap: 1,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
  },
  userName: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    marginBottom: 20,
  },
  displayText: {
    ...EditorialTypography.display,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.6,
  },
  displayAccent: {
    ...EditorialTypography.displayAccent,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.6,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    marginTop: 6,
    maxWidth: 280,
  },
});
