// frontend/components/ui/BottomSheetShell.tsx
// ROADMAP 4.0 R15 — Shared bottom-sheet shell.
//
// Pre-R15: `create-collection` (255 LOC) and `create-shopping-list`
// (448 LOC) carried an identical slide-up + backdrop + drag-handle +
// sheet-header + close-button shell. Two copies of the same spring
// animation + the same accessibility plumbing.
//
// This shell consolidates the shared chrome. Each consumer drops in its
// own body content via `children`. Heights differ slightly (82% on
// collection, 92% on shopping list) so the fraction is overridable.

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const SPRING = { damping: 22, stiffness: 220 } as const;

export interface BottomSheetShellProps {
  /** Title in the sheet header (left-aligned, bold). */
  title: string;
  /** Fired on backdrop tap, close button, or programmatic close. */
  onClose: () => void;
  /**
   * Sheet height as a fraction of SCREEN_HEIGHT.
   * Default 0.82 (matches the pre-R15 create-collection height).
   * Pass 0.92 for taller forms (shopping list etc).
   */
  heightFraction?: number;
  /** Disables the close button (e.g., during submit). */
  closeDisabled?: boolean;
  /**
   * Optional right-aligned action in the header (e.g., a "Save" text
   * button on the shopping-list sheet).
   */
  headerAction?: React.ReactNode;
  /**
   * Body content. Rendered inside a KeyboardAvoidingView + ScrollView
   * that the shell owns. Consumers focus on their fields, not on the
   * scroll/keyboard plumbing.
   *
   * Pass `false` for `useScrollView` if the consumer needs full control
   * of its body container (e.g., to host a FlatList or a custom layout).
   */
  children: React.ReactNode;
  /**
   * If false, skip the built-in ScrollView wrapper — children render
   * directly inside the KeyboardAvoidingView. Default: true.
   */
  useScrollView?: boolean;
  /** testID prefix for the sheet (defaults to "bottom-sheet"). */
  testID?: string;
}

export default function BottomSheetShell({
  title,
  onClose,
  heightFraction = 0.82,
  closeDisabled,
  headerAction,
  children,
  useScrollView = true,
  testID = 'bottom-sheet',
}: BottomSheetShellProps) {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark' || theme === 'dark';
  const insets = useSafeAreaInsets();

  const sheetHeight = Math.round(SCREEN_HEIGHT * heightFraction);
  const slideAnim = useRef(new Animated.Value(sheetHeight)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      ...SPRING,
      useNativeDriver: true,
    }).start();
    // sheetHeight is derived from heightFraction; we don't want a re-anim
    // if the consumer toggles heightFraction mid-flight (rare + jarring).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: sheetHeight,
      ...SPRING,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [slideAnim, sheetHeight, onClose]);

  const sheetBg = isDark ? DarkColors.background : '#FFFFFF';
  const labelColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subColor = isDark ? DarkColors.text.tertiary : Colors.text.secondary;
  const borderColor = isDark ? '#374151' : '#D1D5DB';

  return (
    <View style={styles.root} testID={testID}>
      <TouchableWithoutFeedback
        onPress={handleClose}
        accessibilityLabel="Close sheet"
        accessibilityRole="button"
      >
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            height: sheetHeight,
            backgroundColor: sheetBg,
          },
        ]}
        testID={`${testID}-container`}
      >
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: borderColor }]} />
        </View>

        <View
          style={[
            styles.header,
            { borderBottomColor: borderColor },
          ]}
        >
          <Text style={[styles.headerTitle, { color: labelColor }]}>{title}</Text>
          <View style={styles.headerRight}>
            {headerAction}
            <HapticTouchableOpacity
              onPress={handleClose}
              disabled={closeDisabled}
              style={styles.closeBtn}
              accessibilityLabel="Close"
              accessibilityRole="button"
              testID={`${testID}-close`}
            >
              <Ionicons name="close" size={22} color={subColor} />
            </HapticTouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex1}
        >
          {useScrollView ? (
            <ScrollView
              style={styles.flex1}
              contentContainerStyle={[
                styles.bodyContent,
                { paddingBottom: Math.max(insets.bottom, 20) + 16 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.flex1,
                { paddingBottom: Math.max(insets.bottom, 20) + 16 },
              ]}
            >
              {children}
            </View>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    padding: 4,
  },
  flex1: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
});
