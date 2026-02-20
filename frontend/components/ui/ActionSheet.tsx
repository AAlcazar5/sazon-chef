// frontend/components/ui/ActionSheet.tsx
// Action sheet modal for quick actions

import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing, ComponentSpacing, BorderRadius } from '../../constants/Spacing';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Duration, Spring } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';
import { buttonAccessibility } from '../../utils/accessibility';

export interface ActionSheetItem {
  label: string;
  icon: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
  subtitle?: string;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  items: ActionSheetItem[];
  title?: string;
}

export default function ActionSheet({ visible, onClose, items, title }: ActionSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation for slide from bottom
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      // Reset and animate in from bottom
      opacity.setValue(0);
      translateY.setValue(100);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: Spring.default.friction,
          tension: Spring.default.tension,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();

      // Haptic feedback when opening
      HapticPatterns.actionSheetOpen();
    } else {
      // Animate out to bottom
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleItemPress = (item: ActionSheetItem) => {
    if (item.destructive) {
      HapticPatterns.buttonPressDestructive();
    } else {
      HapticPatterns.buttonPress();
    }
    item.onPress();
    onClose();
  };

  const handleCancel = () => {
    HapticPatterns.buttonPress();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Close action sheet">
        <Animated.View
          className="flex-1 bg-black/50"
          style={{ opacity }}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  backgroundColor: isDark ? DarkColors.surface : Colors.surface,
                  transform: [{ translateY }],
                },
              ]}
              accessibilityRole="menu"
              accessibilityLabel={title || 'Action sheet'}
            >
              {/* Handle */}
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: isDark ? DarkColors.border.medium : Colors.border.light }]} />
              </View>

              {/* Title */}
              {title && (
                <View style={[styles.titleContainer, { borderBottomColor: isDark ? DarkColors.border.light : Colors.border.light }]}>
                  <Text style={[styles.title, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
                    {title}
                  </Text>
                </View>
              )}

              {/* Action Items */}
              <View style={styles.itemsContainer}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleItemPress(item)}
                    style={[
                      styles.item,
                      {
                        backgroundColor: item.destructive
                          ? (isDark ? 'rgba(220, 38, 38, 0.1)' : 'rgba(254, 226, 226, 1)')
                          : (isDark ? DarkColors.background : '#F9FAFB'),
                      },
                    ]}
                    {...buttonAccessibility(item.label, {
                      hint: item.destructive ? 'This is a destructive action' : undefined,
                    })}
                    accessibilityRole="menuitem"
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: item.destructive
                            ? (isDark ? 'rgba(220, 38, 38, 0.2)' : 'rgba(254, 202, 202, 1)')
                            : (isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 237, 213, 1)'),
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={item.destructive ? Colors.secondaryRed : Colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.itemLabel,
                        {
                          color: item.destructive
                            ? (isDark ? '#F87171' : Colors.secondaryRed)
                            : (isDark ? DarkColors.text.primary : Colors.text.primary),
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.subtitle ? (
                      <View style={{
                        backgroundColor: isDark ? 'rgba(249, 115, 22, 0.2)' : '#FFF7ED',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        marginRight: 4,
                      }}>
                        <Text style={{
                          fontSize: FontSize.xs,
                          fontWeight: FontWeight.semibold as any,
                          color: Colors.primary,
                        }}>
                          {item.subtitle}
                        </Text>
                      </View>
                    ) : null}
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={handleCancel}
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: isDark ? DarkColors.background : '#F3F4F6',
                    borderColor: isDark ? DarkColors.border.light : Colors.border.light,
                  },
                ]}
                {...buttonAccessibility('Cancel')}
              >
                <Text style={[styles.cancelText, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: BorderRadius.full,
  },
  titleContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  itemsContainer: {
    paddingHorizontal: ComponentSpacing.actionSheet.padding,
    paddingVertical: Spacing.sm,
    gap: ComponentSpacing.actionSheet.itemGap,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  cancelButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});

