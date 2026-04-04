import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useColorScheme } from 'nativewind';
import Icon from './Icon';
import { Icons } from '../../constants/Icons';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import LogoMascot, { LogoMascotExpression } from '../mascot/LogoMascot';
import { Spacing, ComponentSpacing, BorderRadius } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { EmptyStateConfig } from '../../constants/EmptyStates';
import { buttonAccessibility } from '../../utils/accessibility';

interface AnimatedEmptyStateProps {
  /** Icon name from Icons constant (if not using mascot) */
  icon?: keyof typeof Icons;
  /** Title text displayed prominently */
  title: string;
  /** Description/subtitle text */
  description?: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Action button press handler */
  onAction?: () => void;
  /** Icon size (default: 64) */
  iconSize?: number;
  /** Icon color (default: gray) */
  iconColor?: string;
  /** Whether to use mascot instead of icon */
  useMascot?: boolean;
  /** Mascot expression to use */
  mascotExpression?: LogoMascotExpression;
  /** Mascot size */
  mascotSize?: 'tiny' | 'small' | 'medium' | 'large' | 'hero';
  /** Pastel tint background color (light mode) — wraps content in a tinted card */
  pastelTint?: string;
  /** Pastel tint background color (dark mode) */
  pastelTintDark?: string;
  /** Use predefined empty state config */
  config?: EmptyStateConfig;
}

export default function AnimatedEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  iconSize = ComponentSpacing.emptyState.iconSize,
  iconColor,
  useMascot = false,
  mascotExpression = 'curious',
  mascotSize = 'medium',
  pastelTint,
  pastelTintDark,
  config,
}: AnimatedEmptyStateProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Use config values if provided
  const displayTitle = config?.title ?? title;
  const displayDescription = config?.description ?? description;
  const displayActionLabel = config?.actionLabel ?? actionLabel;
  const displayUseMascot = config?.useMascot ?? useMascot;
  const displayMascotExpression = config?.mascotExpression ?? mascotExpression;
  const displayMascotSize = config?.mascotSize ?? mascotSize;
  const displayPastelTint = config?.pastelTint ?? pastelTint;
  const displayPastelTintDark = config?.pastelTintDark ?? pastelTintDark;

  const defaultIconColor = isDark ? DarkColors.text.tertiary : Colors.text.tertiary;
  const hasTint = !!(displayPastelTint || displayPastelTintDark);
  const tintBg = isDark ? displayPastelTintDark : displayPastelTint;

  const handleAction = () => {
    HapticPatterns.buttonPressPrimary();
    onAction?.();
  };

  const content = (
    <>
      {/* Icon/mascot — entrance fade+scale, then gentle float loop */}
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
      >
        <MotiView
          from={{ translateY: 0 }}
          animate={{ translateY: -8 }}
          transition={{ type: 'timing', duration: 1800, loop: true, repeatReverse: true }}
        >
          {displayUseMascot ? (
            <LogoMascot
              expression={displayMascotExpression}
              size={displayMascotSize}
            />
          ) : (
            icon && (
              <Icon
                name={icon as any}
                size={iconSize}
                color={iconColor ?? defaultIconColor}
                accessibilityLabel={displayTitle}
              />
            )
          )}
        </MotiView>
      </MotiView>

      {/* Title — staggered entrance */}
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 100, damping: 20, stiffness: 180 }}
      >
        <Text
          style={[
            styles.title,
            { color: isDark ? DarkColors.text.secondary : Colors.text.secondary },
          ]}
        >
          {displayTitle}
        </Text>
      </MotiView>

      {/* Description */}
      {displayDescription && (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 180, damping: 20, stiffness: 180 }}
        >
          <Text
            style={[
              styles.description,
              { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary },
            ]}
          >
            {displayDescription}
          </Text>
        </MotiView>
      )}

      {/* CTA button — entrance + pulsing scale */}
      {displayActionLabel && onAction && (
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 260, damping: 20, stiffness: 180 }}
        >
          <MotiView
            from={{ scale: 1 }}
            animate={{ scale: 1.05 }}
            transition={{ type: 'timing', duration: 900, loop: true, repeatReverse: true, delay: 1000 }}
          >
            <HapticTouchableOpacity
              onPress={handleAction}
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? DarkColors.primary : Colors.primary },
              ]}
              {...buttonAccessibility(displayActionLabel)}
            >
              <Text style={styles.actionButtonText}>{displayActionLabel}</Text>
            </HapticTouchableOpacity>
          </MotiView>
        </MotiView>
      )}
    </>
  );

  // Wrap in tinted card if pastel tint is provided
  if (hasTint && tintBg) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.tintCard,
            { backgroundColor: tintBg },
            Shadows.SM as any,
          ]}
        >
          {content}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: ComponentSpacing.emptyState.padding,
  },
  tintCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    padding: ComponentSpacing.emptyState.padding,
    width: '100%',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: ComponentSpacing.emptyState.titleGap,
  },
  description: {
    fontSize: FontSize.base,
    textAlign: 'center',
    marginTop: ComponentSpacing.emptyState.descriptionGap,
    lineHeight: FontSize.base * 1.5,
  },
  actionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: ComponentSpacing.emptyState.actionGap,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});

