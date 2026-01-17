// FormSelect - Standardized select/dropdown component for Sazon Chef
// Provides consistent styling, validation states, and accessibility
// Supports both inline chip selection and modal picker for longer lists

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Animated,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { Duration } from '../../constants/Animations';
import HapticTouchableOpacity from './HapticTouchableOpacity';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

interface FormSelectProps {
  /** Label text displayed above the select */
  label?: string;
  /** Hint text displayed below the select */
  hint?: string;
  /** Error message to display (shows error state when present) */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Available options */
  options: SelectOption[];
  /** Currently selected value */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Placeholder text when nothing selected */
  placeholder?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Container style override */
  containerStyle?: ViewStyle;
  /** Display mode: 'dropdown' opens a modal, 'chips' shows inline buttons */
  mode?: 'dropdown' | 'chips';
  /** For chips mode: number of columns (default: auto based on option count) */
  columns?: number;
  /** Title for the modal (dropdown mode) */
  modalTitle?: string;
}

export default function FormSelect({
  label,
  hint,
  error,
  required = false,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  containerStyle,
  mode = 'dropdown',
  columns,
  modalTitle,
}: FormSelectProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasError = Boolean(error);
  const selectedOption = options.find(opt => opt.value === value);

  // Colors based on state
  const colors = {
    border: hasError
      ? Colors.error
      : (isDark ? DarkColors.border.light : Colors.border.light),
    borderFocused: isDark ? DarkColors.primary : Colors.primary,
    background: disabled
      ? (isDark ? '#1a1a2e' : '#F3F4F6')
      : (isDark ? '#1F2937' : '#FFFFFF'),
    text: disabled
      ? (isDark ? DarkColors.text.tertiary : Colors.text.tertiary)
      : (isDark ? DarkColors.text.primary : Colors.text.primary),
    placeholder: isDark ? DarkColors.text.tertiary : Colors.text.tertiary,
    label: isDark ? DarkColors.text.primary : Colors.text.primary,
    hint: isDark ? DarkColors.text.secondary : Colors.text.secondary,
    error: Colors.error,
    chipBackground: isDark ? '#374151' : '#F3F4F6',
    chipBackgroundSelected: isDark ? DarkColors.primary : Colors.primary,
    chipText: isDark ? DarkColors.text.primary : Colors.text.primary,
    chipTextSelected: '#FFFFFF',
    modalBackground: isDark ? '#1F2937' : '#FFFFFF',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
  };

  const openModal = () => {
    if (disabled) return;
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: Duration.normal,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: Duration.fast,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const handleSelect = (optionValue: string) => {
    if (disabled) return;
    onChange?.(optionValue);
    if (mode === 'dropdown') {
      closeModal();
    }
  };

  // Calculate columns for chips mode
  const getColumns = () => {
    if (columns) return columns;
    if (options.length <= 3) return options.length;
    if (options.length <= 6) return 3;
    return 2;
  };

  const renderDropdownTrigger = () => (
    <HapticTouchableOpacity
      onPress={openModal}
      disabled={disabled}
      style={[
        styles.dropdownTrigger,
        {
          borderColor: hasError ? colors.error : colors.border,
          backgroundColor: colors.background,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label || 'Select'}: ${selectedOption?.label || placeholder}`}
      accessibilityHint="Double tap to open selection"
    >
      {selectedOption?.icon && (
        <Ionicons
          name={selectedOption.icon}
          size={20}
          color={colors.text}
          style={styles.dropdownIcon}
        />
      )}
      <Text
        style={[
          styles.dropdownText,
          {
            color: selectedOption ? colors.text : colors.placeholder,
          },
        ]}
        numberOfLines={1}
      >
        {selectedOption?.label || placeholder}
      </Text>
      <Ionicons
        name="chevron-down"
        size={20}
        color={colors.placeholder}
      />
    </HapticTouchableOpacity>
  );

  const renderChips = () => {
    const cols = getColumns();

    return (
      <View style={[styles.chipsContainer, { flexWrap: 'wrap' }]}>
        {options.map((option) => {
          const isSelected = value === option.value;
          const isDisabled = disabled || option.disabled;

          return (
            <HapticTouchableOpacity
              key={option.value}
              onPress={() => handleSelect(option.value)}
              disabled={isDisabled}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? colors.chipBackgroundSelected
                    : colors.chipBackground,
                  borderColor: isSelected
                    ? colors.chipBackgroundSelected
                    : hasError
                      ? colors.error
                      : 'transparent',
                  opacity: isDisabled ? 0.5 : 1,
                  width: cols <= 3 ? `${Math.floor(100 / cols) - 2}%` : 'auto',
                  minWidth: cols > 3 ? '48%' : undefined,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
            >
              {option.icon && (
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={isSelected ? colors.chipTextSelected : colors.chipText}
                  style={styles.chipIcon}
                />
              )}
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? colors.chipTextSelected : colors.chipText,
                  },
                ]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.chipTextSelected}
                  style={styles.chipCheckmark}
                />
              )}
            </HapticTouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            backgroundColor: colors.modalOverlay,
            opacity: fadeAnim,
          },
        ]}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal} />
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.modalBackground,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {modalTitle || label || 'Select an option'}
            </Text>
            <HapticTouchableOpacity onPress={closeModal} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </HapticTouchableOpacity>
          </View>

          {/* Options List */}
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {options.map((option, index) => {
              const isSelected = value === option.value;
              const isDisabled = option.disabled;

              return (
                <HapticTouchableOpacity
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  disabled={isDisabled}
                  style={[
                    styles.modalOption,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)')
                        : 'transparent',
                      opacity: isDisabled ? 0.5 : 1,
                      borderBottomWidth: index < options.length - 1 ? 1 : 0,
                      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  {option.icon && (
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={isSelected ? (isDark ? DarkColors.primary : Colors.primary) : colors.text}
                      style={styles.modalOptionIcon}
                    />
                  )}
                  <View style={styles.modalOptionContent}>
                    <Text
                      style={[
                        styles.modalOptionLabel,
                        {
                          color: isSelected
                            ? (isDark ? DarkColors.primary : Colors.primary)
                            : colors.text,
                          fontWeight: isSelected ? FontWeight.semibold : FontWeight.regular,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text style={[styles.modalOptionDescription, { color: colors.hint }]}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={isDark ? DarkColors.primary : Colors.primary}
                    />
                  )}
                </HapticTouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.label }]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      {/* Select Content */}
      {mode === 'dropdown' ? renderDropdownTrigger() : renderChips()}

      {/* Error or Hint */}
      <View style={styles.bottomRow}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={14} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : hint ? (
          <Text style={[styles.hint, { color: colors.hint }]}>{hint}</Text>
        ) : null}
      </View>

      {/* Modal (dropdown mode only) */}
      {mode === 'dropdown' && renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  required: {
    color: Colors.error,
    fontWeight: '500',
  },
  bottomRow: {
    marginTop: Spacing.xs,
    minHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  hint: {
    fontSize: FontSize.sm,
  },

  // Dropdown styles
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  dropdownIcon: {
    marginRight: Spacing.sm,
  },
  dropdownText: {
    flex: 1,
    fontSize: FontSize.md,
  },

  // Chips styles
  chipsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  chipIcon: {
    marginRight: Spacing.xs,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  chipCheckmark: {
    marginLeft: Spacing.xs,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing['2xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  modalClose: {
    padding: Spacing.xs,
  },
  modalScroll: {
    paddingHorizontal: Spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  modalOptionIcon: {
    marginRight: Spacing.md,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionLabel: {
    fontSize: FontSize.md,
  },
  modalOptionDescription: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});
