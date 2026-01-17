import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import Icon from './Icon';
import { Icons } from '../../constants/Icons';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import LogoMascot, { LogoMascotExpression } from '../mascot/LogoMascot';
import { Spacing, ComponentSpacing, BorderRadius } from '../../constants/Spacing';
import { Typography, FontSize } from '../../constants/Typography';
import { Duration } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';
import { Colors, DarkColors } from '../../constants/Colors';
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

  const defaultIconColor = isDark ? DarkColors.text.tertiary : Colors.text.tertiary;

  const bounceScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle bounce animation
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceScale, {
          toValue: 1.1,
          duration: Duration.extended * 1.5,
          useNativeDriver: true,
        }),
        Animated.timing(bounceScale, {
          toValue: 1,
          duration: Duration.extended * 1.5,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse opacity animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.6,
          duration: Duration.extended * 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: Duration.extended * 2,
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnimation.start();
    pulseAnimation.start();

    return () => {
      bounceAnimation.stop();
      pulseAnimation.stop();
    };
  }, [bounceScale, pulseOpacity]);

  const handleAction = () => {
    HapticPatterns.buttonPressPrimary();
    onAction?.();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [{ scale: bounceScale }],
          opacity: pulseOpacity,
        }}
      >
        {displayUseMascot ? (
          <LogoMascot
            expression={displayMascotExpression}
            size={displayMascotSize}
          />
        ) : (
          icon && (
            <Icon
              name={icon}
              size={iconSize}
              color={iconColor ?? defaultIconColor}
              accessibilityLabel={displayTitle}
            />
          )
        )}
      </Animated.View>
      <Text
        style={[
          styles.title,
          { color: isDark ? DarkColors.text.secondary : Colors.text.secondary },
        ]}
      >
        {displayTitle}
      </Text>
      {displayDescription && (
        <Text
          style={[
            styles.description,
            { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary },
          ]}
        >
          {displayDescription}
        </Text>
      )}
      {displayActionLabel && onAction && (
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
      )}
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

