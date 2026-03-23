// frontend/components/ui/BrandButton.tsx
// The canonical gradient pill button — spring press, colored shadow glow, pastel variants.
// Replaces ad-hoc gradient + HapticTouchableOpacity combos across the app.

import { useEffect } from 'react';
import { StyleSheet, Text, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Variant definitions ────────────────────────────────────────────────────────

export type BrandButtonVariant =
  | 'brand'
  | 'sage'
  | 'golden'
  | 'lavender'
  | 'peach'
  | 'sky'
  | 'blush'
  | 'ghost';

export type BrandButtonSize = 'large' | 'compact';

interface VariantConfig {
  gradient: readonly [string, string];
  shadow: string;
  textColor: string;
}

const VARIANT_CONFIG: Record<BrandButtonVariant, VariantConfig> = {
  brand:    { gradient: ['#fa7e12', '#EF4444'], shadow: '#EF4444', textColor: '#FFFFFF' },
  sage:     { gradient: ['#81C784', '#66BB6A'], shadow: '#66BB6A', textColor: '#FFFFFF' },
  golden:   { gradient: ['#FFD54F', '#FFC107'], shadow: '#FFC107', textColor: '#2C1810' },
  lavender: { gradient: ['#CE93D8', '#AB47BC'], shadow: '#AB47BC', textColor: '#FFFFFF' },
  peach:    { gradient: ['#FFB74D', '#FF9800'], shadow: '#FF9800', textColor: '#FFFFFF' },
  sky:      { gradient: ['#64B5F6', '#42A5F5'], shadow: '#42A5F5', textColor: '#FFFFFF' },
  blush:    { gradient: ['#F06292', '#EC407A'], shadow: '#EC407A', textColor: '#FFFFFF' },
  ghost:    { gradient: ['transparent', 'rgba(250,126,18,0.05)'], shadow: 'transparent', textColor: '#fa7e12' },
};

// ─── Size definitions ───────────────────────────────────────────────────────────

interface SizeConfig {
  paddingVertical: number;
  paddingHorizontal: number;
  fontSize: number;
  iconSize: number;
}

const SIZE_CONFIG: Record<BrandButtonSize, SizeConfig> = {
  large:   { paddingVertical: 14, paddingHorizontal: 24, fontSize: 17, iconSize: 20 },
  compact: { paddingVertical: 6,  paddingHorizontal: 10, fontSize: 12, iconSize: 14 },
};

// ─── Props ──────────────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface BrandButtonProps {
  /** Button label text */
  label: string;
  onPress: () => void;
  /** Color variant (default: 'brand') */
  variant?: BrandButtonVariant;
  /** Size variant (default: 'large') */
  size?: BrandButtonSize;
  /** Ionicons icon name shown left of label */
  icon?: IoniconName;
  /** Emoji shown left of label (alternative to icon) */
  emoji?: string;
  /** Custom gradient colors — overrides variant */
  gradient?: readonly [string, string];
  /** Subtle idle breathing animation for hero CTAs (default: false) */
  idlePulse?: boolean;
  /** Show loading spinner instead of label */
  loading?: boolean;
  /** Disabled state — 55% opacity, ignores press */
  disabled?: boolean;
  /** Extra style applied to the outer wrapper */
  style?: ViewStyle;
  /** Haptic feedback intensity (default: 'medium') */
  hapticStyle?: 'light' | 'medium' | 'heavy';
  testID?: string;
  accessibilityLabel?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function BrandButton({
  label,
  onPress,
  variant = 'brand',
  size = 'large',
  icon,
  emoji,
  gradient,
  idlePulse = false,
  loading = false,
  disabled = false,
  style,
  hapticStyle = 'medium',
  testID,
  accessibilityLabel,
}: BrandButtonProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  const config = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];
  const colors = gradient ?? config.gradient;
  const isInteractive = !disabled && !loading;

  // Idle pulse — subtle 1.0 → 1.02 breathing animation
  useEffect(() => {
    if (idlePulse && !reducedMotion) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 900 }),
          withTiming(1.0, { duration: 900 }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = 1;
    }
  }, [idlePulse, reducedMotion]);

  const handlePressIn = () => {
    if (!isInteractive || reducedMotion) return;
    scale.value = withSpring(0.95, { damping: 10, stiffness: 400 });
  };

  const handlePressOut = () => {
    if (!isInteractive || reducedMotion) return;
    scale.value = withSpring(1, { damping: 8, stiffness: 300 });
  };

  const handlePress = () => {
    if (!isInteractive) return;
    const impactMap = { light: ImpactStyle.LIGHT, medium: ImpactStyle.MEDIUM, heavy: ImpactStyle.HEAVY };
    triggerHaptic(impactMap[hapticStyle]);
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  // Shadow — reduced opacity in dark mode handled by RN platform
  const shadowStyle: ViewStyle = variant === 'ghost' ? {} : {
    shadowColor: config.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isInteractive ? 0.35 : 0,
    shadowRadius: 10,
    elevation: isInteractive ? 6 : 0,
  };

  const pillStyle: ViewStyle = {
    paddingVertical: sizeConfig.paddingVertical,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  };

  const labelStyle: TextStyle = {
    color: config.textColor,
    fontWeight: '800',
    fontSize: sizeConfig.fontSize,
    letterSpacing: 0.2,
  };

  return (
    <Animated.View style={[shadowStyle, animStyle, disabled && styles.disabled, style]}>
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isInteractive}
        activeOpacity={1}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !isInteractive, busy: loading }}
      >
        <LinearGradient
          colors={colors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={pillStyle}
        >
          {loading ? (
            <ActivityIndicator color={config.textColor} size="small" />
          ) : (
            <>
              {emoji && <Text style={[styles.emoji, { fontSize: sizeConfig.iconSize }]}>{emoji}</Text>}
              {icon && !emoji && (
                <Ionicons
                  name={icon}
                  size={sizeConfig.iconSize}
                  color={config.textColor}
                  style={styles.iconSpacing}
                />
              )}
              <Text style={labelStyle}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </AnimatedTouchable>
    </Animated.View>
  );
}

// ─── Re-exports for consumers ───────────────────────────────────────────────────
export { VARIANT_CONFIG, SIZE_CONFIG };

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.55,
  },
  emoji: {
    marginRight: 8,
  },
  iconSpacing: {
    marginRight: 8,
  },
});
