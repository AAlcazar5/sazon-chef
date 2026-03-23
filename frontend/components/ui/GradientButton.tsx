// frontend/components/ui/GradientButton.tsx
// Backward-compatible wrapper around BrandButton.
// Maps legacy GradientPresets to BrandButton variants/custom gradients.

import { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BrandButton, { BrandButtonVariant } from './BrandButton';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Legacy named gradient presets — kept for backward compatibility */
export const GradientPresets = {
  brand:   ['#F97316', '#E8A308'] as [string, string],
  fire:    ['#F97316', '#E11D48'] as [string, string],
  fresh:   ['#059669', '#0D9488'] as [string, string],
  premium: ['#9333EA', '#4F46E5'] as [string, string],
  danger:  ['#EF4444', '#BE123C'] as [string, string],
  info:    ['#2563EB', '#4F46E5'] as [string, string],
};

/** Map legacy preset colors to BrandButton variants where possible */
const PRESET_TO_VARIANT: Record<string, BrandButtonVariant> = {
  '#F97316,#E8A308': 'brand',
  '#059669,#0D9488': 'sage',
  '#9333EA,#4F46E5': 'lavender',
  '#2563EB,#4F46E5': 'sky',
};

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  icon?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  colors?: [string, string, ...string[]];
  style?: ViewStyle;
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
  // Try to match to a BrandButton variant; otherwise pass custom gradient
  const key = `${colors[0]},${colors[1]}`;
  const variant = PRESET_TO_VARIANT[key];

  return (
    <BrandButton
      label={label}
      onPress={onPress}
      icon={icon}
      disabled={disabled}
      loading={loading}
      variant={variant ?? 'brand'}
      gradient={variant ? undefined : [colors[0], colors[1]]}
      style={style}
      hapticStyle={hapticStyle}
      testID={testID}
    />
  );
}
