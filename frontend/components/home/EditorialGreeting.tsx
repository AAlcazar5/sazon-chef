import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { LogoMascot } from '../mascot';

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

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.greetingRow}>
          <LogoMascot size={36} />
          <View style={styles.greetingText}>
            <Text style={styles.eyebrow}>{greeting}</Text>
            {userName && <Text style={styles.userName}>Hi, {userName}</Text>}
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            testID="search-button"
            onPress={onSearchPress}
            style={styles.iconButton}
            accessibilityLabel="Search"
            accessibilityRole="button"
          >
            <Ionicons name="search" size={20} color="#111827" />
          </Pressable>
          <Pressable
            testID="notifications-button"
            onPress={onNotificationsPress}
            style={styles.iconButton}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={20} color="#111827" />
          </Pressable>
        </View>
      </View>

      {/* Editorial headline */}
      <View style={styles.headline}>
        <Text style={styles.displayText}>
          {headlineWord}{' '}
          <Text style={styles.displayAccent}>picks</Text>
          <Text style={styles.orangePeriod}>.</Text>
        </Text>
        <Text style={styles.subtitle}>
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
    color: '#9CA3AF',
  },
  userName: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    marginBottom: 20,
  },
  displayText: {
    ...EditorialTypography.display,
    color: '#111827',
  },
  displayAccent: {
    ...EditorialTypography.displayAccent,
    color: '#111827',
  },
  orangePeriod: {
    ...EditorialTypography.display,
    color: '#fa7e12',
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
    maxWidth: 280,
  },
});
