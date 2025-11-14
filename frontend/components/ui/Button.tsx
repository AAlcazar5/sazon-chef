import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import AnimatedActivityIndicator from './AnimatedActivityIndicator';
import RippleEffect from './RippleEffect';

// Interfaces for this component
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left'
}: ButtonProps) {
  // Base classes
  const baseClasses = `
    flex-row items-center justify-center rounded-lg font-semibold
    ${fullWidth ? 'w-full' : 'self-start'}
    ${disabled ? 'opacity-50' : ''}
  `;

  // Variant styles
  const variantStyles = {
    primary: 'bg-orange-500 dark:bg-orange-600 border border-orange-500 dark:border-orange-600',
    secondary: 'bg-gray-500 dark:bg-gray-600 border border-gray-500 dark:border-gray-600',
    outline: 'bg-transparent border border-gray-300 dark:border-gray-600',
    danger: 'bg-red-500 dark:bg-red-600 border border-red-500 dark:border-red-600',
    accent: 'bg-red-500 dark:bg-red-400 border border-red-500 dark:border-red-400' // Red accent variant
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4'
  };

  // Text color styles
  const textColorStyles = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-gray-700 dark:text-gray-100',
    danger: 'text-white',
    accent: 'text-white'
  };

  // Text size styles
  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const containerClasses = `
    ${baseClasses}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
  `;

  const textClasses = `
    ${textColorStyles[variant]}
    ${textSizeStyles[size]}
    font-semibold
  `;

  const handlePress = () => {
    // Haptic feedback on button press
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  // Ripple color based on variant
  const rippleColors = {
    primary: 'rgba(255, 255, 255, 0.5)',
    secondary: 'rgba(255, 255, 255, 0.5)',
    outline: 'rgba(0, 0, 0, 0.1)',
    danger: 'rgba(255, 255, 255, 0.5)',
    accent: 'rgba(255, 255, 255, 0.5)',
  };

  return (
    <RippleEffect
      className={containerClasses}
      onPress={handlePress}
      disabled={disabled || loading}
      rippleColor={rippleColors[variant]}
      rippleOpacity={0.3}
    >
      {loading ? (
        <AnimatedActivityIndicator 
          size="small" 
          color={variant === 'outline' ? '#374151' : '#FFFFFF'} 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View className="mr-2">
              {icon}
            </View>
          )}
          
          <Text className={textClasses}>
            {title}
          </Text>

          {icon && iconPosition === 'right' && (
            <View className="ml-2">
              {icon}
            </View>
          )}
        </>
      )}
    </RippleEffect>
  );
}