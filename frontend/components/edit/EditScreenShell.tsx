// frontend/components/edit/EditScreenShell.tsx
// Shared chrome for edit / profile / settings screens.
//
// Mirrors what <AuthScreenShell> does for the auth flow — eliminates the
// duplicated ScreenGradient + SafeAreaView + KeyboardAvoidingContainer +
// header-bar (back / title / optional save) scaffolding that lived in
// edit-budget, edit-macro-goals, edit-preferences, edit-physical-profile,
// and weight-input.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../ui/KeyboardAvoidingContainer';
import ScreenGradient from '../ui/ScreenGradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Brand, Ink } from '../../constants/tokens';
import { Spacing } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';

export interface EditScreenShellRightAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export interface EditScreenShellProps {
  title: string;
  onBack?: () => void;
  rightAction?: EditScreenShellRightAction;
  children: React.ReactNode;
  /** Skip the built-in ScrollView (caller renders own scroll container). */
  noScroll?: boolean;
  /** Skip the keyboard-avoiding wrapper (rare). */
  noKeyboardAvoid?: boolean;
  /** Custom content container style for the ScrollView. */
  contentContainerStyle?: ViewStyle;
  /** Forward extra ScrollView props (e.g., refreshControl). */
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>;
  testID?: string;
}

const HEADER_ICON_HIT = 4;
const HEADER_SPACER_WIDTH = 40;

export default function EditScreenShell({
  title,
  onBack,
  rightAction,
  children,
  noScroll = false,
  noKeyboardAvoid = false,
  contentContainerStyle,
  scrollViewProps,
  testID,
}: EditScreenShellProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const inkPrimary = isDark ? Ink.dark.primary : Ink.light.primary;
  const inkMuted = isDark ? Ink.dark.tertiary : Ink.light.tertiary;
  const rightActionColor = isDark ? Brand.dark.base : Brand.light.base;

  const handleBack = onBack ?? (() => router.back());

  const header = (
    <View style={styles.header} testID={testID ? `${testID}-header` : undefined}>
      <HapticTouchableOpacity
        onPress={handleBack}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={inkPrimary} />
      </HapticTouchableOpacity>

      <Text
        style={[styles.title, { color: inkPrimary }]}
        accessibilityRole="header"
        accessibilityLabel={title}
        numberOfLines={1}
      >
        {title}
      </Text>

      {rightAction ? (
        <HapticTouchableOpacity
          onPress={rightAction.onPress}
          disabled={rightAction.disabled ?? rightAction.loading}
          style={styles.rightAction}
          accessibilityRole="button"
          accessibilityLabel={rightAction.loading ? `${rightAction.label}…` : rightAction.label}
          accessibilityState={{
            disabled: rightAction.disabled ?? rightAction.loading,
            busy: rightAction.loading,
          }}
        >
          <Text
            style={[
              styles.rightActionText,
              { color: rightAction.loading || rightAction.disabled ? inkMuted : rightActionColor },
            ]}
          >
            {rightAction.loading ? 'Saving…' : rightAction.label}
          </Text>
        </HapticTouchableOpacity>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );

  const body = noScroll ? (
    children
  ) : (
    <ScrollView
      style={styles.scrollFlex}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );

  const safeAreaInner = (
    <SafeAreaView style={styles.safeArea} edges={['top']} testID={testID}>
      {noKeyboardAvoid ? (
        <>
          {header}
          {body}
        </>
      ) : (
        <KeyboardAvoidingContainer>
          {header}
          {body}
        </KeyboardAvoidingContainer>
      )}
    </SafeAreaView>
  );

  return <ScreenGradient>{safeAreaInner}</ScreenGradient>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2, // 14
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: HEADER_ICON_HIT,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  rightAction: {
    padding: HEADER_ICON_HIT,
    minWidth: HEADER_SPACER_WIDTH,
    alignItems: 'flex-end',
  },
  rightActionText: {
    fontSize: FontSize.md,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  headerSpacer: {
    width: HEADER_SPACER_WIDTH,
  },
  scrollFlex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
});
