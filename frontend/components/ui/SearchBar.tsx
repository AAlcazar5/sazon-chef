// frontend/components/ui/SearchBar.tsx
// Unified search bar component for consistent styling across all screens

import React, { forwardRef } from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import Icon from './Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';

interface SearchBarProps {
  /** Current search text */
  value: string;
  /** Called when text changes */
  onChangeText: (text: string) => void;
  /** Called when clear button is pressed */
  onClear?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Called when submit/return is pressed */
  onSubmitEditing?: () => void;
  /** Called when input gains focus */
  onFocus?: () => void;
  /** Called when input loses focus */
  onBlur?: () => void;
  /** Optional right-side accessory (e.g., voice input button) */
  rightAccessory?: React.ReactNode;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Additional TextInput props */
  textInputProps?: Partial<TextInputProps>;
  /** Container style override */
  style?: any;
  /** Test ID */
  testID?: string;
}

const SearchBar = forwardRef<TextInput, SearchBarProps>(({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search...',
  onSubmitEditing,
  onFocus,
  onBlur,
  rightAccessory,
  accessibilityLabel = 'Search',
  accessibilityHint,
  textInputProps,
  style,
  testID,
}, ref) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6',
        },
        style,
      ]}
      testID={testID}
    >
      <Icon
        name={Icons.SEARCH}
        size={IconSizes.SM}
        color={isDark ? '#9CA3AF' : '#6B7280'}
        accessibilityLabel=""
        style={styles.icon}
      />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
        style={[
          styles.input,
          { color: isDark ? DarkColors.text.primary : Colors.text.primary },
        ]}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        {...textInputProps}
      />
      {value.length > 0 && (
        <HapticTouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hapticStyle="light"
          pressedScale={0.9}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Icon
            name={Icons.CLOSE_CIRCLE}
            size={IconSizes.SM}
            color={isDark ? '#9CA3AF' : '#6B7280'}
            accessibilityLabel=""
          />
        </HapticTouchableOpacity>
      )}
      {rightAccessory}
    </View>
  );
});

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  container: {
    height: 40,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default SearchBar;
