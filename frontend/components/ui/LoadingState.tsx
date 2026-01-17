import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { AnimatedLogoMascot } from '../mascot';
import { LogoMascotExpression } from '../mascot/LogoMascot';
import { Spacing, ComponentSpacing } from '../../constants/Spacing';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Colors, DarkColors } from '../../constants/Colors';
import type { LoadingStateConfig } from '../../constants/LoadingStates';

interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Mascot expression to show */
  expression?: LogoMascotExpression;
  /** Size of the mascot */
  size?: 'small' | 'medium' | 'large';
  /** Whether to take full screen */
  fullScreen?: boolean;
  /** Optional subtitle/hint text */
  subtitle?: string;
  /** Animation type for mascot */
  animationType?: 'pulse' | 'bounce' | 'wiggle' | 'none';
  /** Pre-configured loading state (overrides individual props) */
  config?: LoadingStateConfig;
}

export default function LoadingState({
  message = 'Loading...',
  expression = 'thinking',
  size = 'large',
  fullScreen = false,
  subtitle,
  animationType = 'pulse',
  config,
}: LoadingStateProps) {
  // If config is provided, use its values
  const finalMessage = config?.message ?? message;
  const finalExpression = config?.mascotExpression ?? expression;
  const finalSize = config?.mascotSize ?? size;
  const finalSubtitle = config?.hint ?? subtitle;
  const finalAnimationType = config?.animationType ?? animationType;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const containerStyle = fullScreen
    ? styles.fullScreenContainer
    : styles.container;

  return (
    <View
      style={containerStyle}
      accessible={true}
      accessibilityLabel={finalMessage}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      <AnimatedLogoMascot
        expression={finalExpression}
        size={finalSize}
        animationType={finalAnimationType}
      />
      <Text
        style={[
          styles.message,
          { color: isDark ? DarkColors.text.secondary : Colors.text.secondary },
        ]}
      >
        {finalMessage}
      </Text>
      {finalSubtitle && (
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary },
          ]}
        >
          {finalSubtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: ComponentSpacing.emptyState.padding,
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: ComponentSpacing.emptyState.padding,
  },
  message: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

