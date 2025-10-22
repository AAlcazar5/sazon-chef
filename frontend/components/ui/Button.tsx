import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

// Interfaces for this component
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
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
    primary: 'bg-orange-500 border border-orange-500',
    secondary: 'bg-gray-500 border border-gray-500',
    outline: 'bg-transparent border border-gray-300',
    danger: 'bg-red-500 border border-red-500'
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
    outline: 'text-gray-700',
    danger: 'text-white'
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

  return (
    <TouchableOpacity
      className={containerClasses}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
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
    </TouchableOpacity>
  );
}