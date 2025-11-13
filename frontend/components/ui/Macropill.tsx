import { View, Text } from 'react-native';

// Interfaces for this component
interface MacroPillProps {
  type: 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar';
  value: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'default' | 'outline' | 'subtle';
}

export default function MacroPill({
  type,
  value,
  unit,
  size = 'md',
  showIcon = false,
  variant = 'default'
}: MacroPillProps) {
  // Type configurations
  const typeConfig = {
    calories: {
      label: 'Cal',
      icon: '🔥',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-800 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    protein: {
      label: 'P',
      icon: '💪',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-800 dark:text-green-300',
      borderColor: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    carbs: {
      label: 'C',
      icon: '🌾',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-800 dark:text-yellow-300',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    fat: {
      label: 'F',
      icon: '🥑',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-800 dark:text-purple-300',
      borderColor: 'border-purple-200 dark:border-purple-800',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    fiber: {
      label: 'Fib',
      icon: '🌿',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-800 dark:text-emerald-300',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    sugar: {
      label: 'Sug',
      icon: '🍬',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
      textColor: 'text-pink-800 dark:text-pink-300',
      borderColor: 'border-pink-200 dark:border-pink-800',
      iconColor: 'text-pink-600 dark:text-pink-400'
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'px-2 py-1',
      text: 'text-xs',
      icon: 'text-xs'
    },
    md: {
      container: 'px-3 py-1.5',
      text: 'text-sm',
      icon: 'text-sm'
    },
    lg: {
      container: 'px-4 py-2',
      text: 'text-base',
      icon: 'text-base'
    }
  };

  // Variant configurations
  const variantConfig = {
    default: {
      container: `${typeConfig[type].bgColor} border ${typeConfig[type].borderColor}`,
      text: typeConfig[type].textColor
    },
    outline: {
      container: `bg-transparent border ${typeConfig[type].borderColor}`,
      text: typeConfig[type].textColor
    },
    subtle: {
      container: `bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600`,
      text: 'text-gray-700 dark:text-gray-100'
    }
  };

  const config = typeConfig[type];
  const sizeStyle = sizeConfig[size];
  const variantStyle = variantConfig[variant];

  const displayUnit = unit || (type === 'calories' ? 'cal' : 'g');

  return (
    <View className={`
      flex-row items-center rounded-full
      ${sizeStyle.container}
      ${variantStyle.container}
    `}>
      {showIcon && (
        <Text className={`${sizeStyle.icon} ${config.iconColor} mr-1`}>
          {config.icon}
        </Text>
      )}
      
      <Text className={`${sizeStyle.text} font-medium ${variantStyle.text}`}>
        {config.label}: {value}
        {displayUnit && <Text className="text-xs opacity-80">{displayUnit}</Text>}
      </Text>
    </View>
  );
}