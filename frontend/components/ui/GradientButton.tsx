// frontend/components/ui/GradientButton.tsx
// Reusable gradient pill button — matches the "Start Cooking" button style in modal.tsx.
// Use GradientButton.presets to pick a named color pair from the app palette.

import { Text, StyleSheet, ViewStyle } from 'react-native';
import AnimatedActivityIndicator from './AnimatedActivityIndicator';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from './HapticTouchableOpacity';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Named gradient presets drawn from the app's Gradients palette */
export const GradientPresets = {
  /** Brand CTA — vivid orange → warm amber (Sign In, Save to Cookbook) */
  brand:   ['#F97316', '#E8A308'] as [string, string],
  /** Cooking / action — bright orange → saturated red (Start Cooking, Surprise Me) */
  fire:    ['#F97316', '#E11D48'] as [string, string],
  /** New account / success — rich emerald → teal (Create Account, Add to Meal Plan) */
  fresh:   ['#059669', '#0D9488'] as [string, string],
  /** Premium / upgrade — vivid purple → deep indigo (Meal Prep, Paywall CTA) */
  premium: ['#9333EA', '#4F46E5'] as [string, string],
  /** Destructive — hot red → deep crimson (Delete, Not Interested) */
  danger:  ['#EF4444', '#BE123C'] as [string, string],
  /** Info / utility — bright blue → rich indigo (Add to Shopping List, Share) */
  info:    ['#2563EB', '#4F46E5'] as [string, string],
};

/** Shadow colors that match each preset for a colored glow effect */
const PRESET_SHADOWS: Record<string, string> = {
  '#F97316': '#F97316',  // brand
  '#9333EA': '#9333EA',  // premium
  '#2563EB': '#2563EB',  // info
  '#059669': '#059669',  // fresh
  '#EF4444': '#EF4444',  // danger
  '#E11D48': '#E11D48',  // fire (fallback to first color)
};

interface GradientButtonProps {
  /** Button label */
  label: string;
  onPress: () => void;
  /** Ionicons icon name shown left of label */
  icon?: IoniconName;
  /** Disabled — shows 60% opacity, blocks press */
  disabled?: boolean;
  /** Loading — replaces label with ActivityIndicator */
  loading?: boolean;
  /** Custom gradient colors. Defaults to brand orange→red */
  colors?: [string, string, ...string[]];
  /** Extra style applied to the outer touchable */
  style?: ViewStyle;
  /** Haptic intensity (defaults to medium) */
  hapticStyle?: 'light' | 'medium' | 'heavy';
  testID?: string;
}

export default function GradientButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  colors = GradientPresets.brand,
  style,
  hapticStyle = 'medium',
  testID,
}: GradientButtonProps) {
  // Colored shadow that matches the gradient for a glow effect
  const shadowColor = PRESET_SHADOWS[colors[0]] || colors[0];

  return (
    <HapticTouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      hapticStyle={hapticStyle}
      style={[
        styles.touchable,
        {
          shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: disabled || loading ? 0 : 0.35,
          shadowRadius: 10,
          elevation: disabled || loading ? 0 : 6,
        },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <AnimatedActivityIndicator color="#FFF" />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={20}
                color="white"
                style={styles.icon}
              />
            )}
            <Text style={styles.label}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.55,
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
