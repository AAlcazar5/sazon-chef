// frontend/components/profile/AppearanceSection.tsx
// Collapsible appearance section with dark mode toggle and theme mode selector

import { View, Text, Switch, Animated, Easing } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useState, useRef } from 'react';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';
import { useTheme } from '../../contexts/ThemeContext';

export default function AppearanceSection() {
  const { theme, themeMode, toggleTheme, setThemeMode, systemColorScheme } = useTheme();
  const isDark = theme === 'dark';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const animValue = useRef(new Animated.Value(1)).current;

  const toggleSection = () => {
    setIsCollapsed(prev => !prev);
    Animated.timing(animValue, {
      toValue: isCollapsed ? 1 : 0,
      duration: Duration.medium,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    HapticPatterns.buttonPress();
  };

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <HapticTouchableOpacity
        onPress={toggleSection}
        className="flex-row items-center justify-between mb-3"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenDark }}>
            <Text className="text-xl">🎨</Text>
          </View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</Text>
        </View>
        <Animated.View
          style={{
            transform: [{
              rotate: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['180deg', '0deg'],
              }),
            }],
          }}
        >
          <Icon
            name={Icons.CHEVRON_DOWN}
            size={IconSizes.MD}
            color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
            accessibilityLabel={isCollapsed ? 'Expand' : 'Collapse'}
          />
        </Animated.View>
      </HapticTouchableOpacity>

      <Animated.View
        style={{
          maxHeight: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1000],
          }),
          opacity: animValue,
          overflow: 'hidden',
        }}
      >
        {/* Theme Toggle */}
        <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center mb-1">
              <Icon
                name={theme === 'dark' ? Icons.DARK_MODE : Icons.LIGHT_MODE}
                size={IconSizes.SM}
                color={isDark ? DarkColors.primary : Colors.primary}
                accessibilityLabel={theme === 'dark' ? 'Dark mode' : 'Light mode'}
              />
              <Text className="text-gray-900 dark:text-gray-100 font-medium ml-2">Dark Mode</Text>
            </View>
            <Text className="text-gray-500 dark:text-gray-200 text-sm">
              {themeMode === 'system'
                ? `Following system settings (${systemColorScheme === 'dark' ? 'Dark' : 'Light'})`
                : themeMode === 'dark'
                  ? 'Dark mode enabled'
                  : 'Light mode enabled'}
            </Text>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
            thumbColor={theme === 'dark' ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>

        {/* Theme Mode Selector */}
        <View className="pt-3">
          <Text className="text-gray-700 dark:text-gray-100 text-sm mb-2 font-medium">Theme Mode</Text>
          <Text className="text-gray-500 dark:text-gray-200 text-xs mb-3">
            Choose how the app theme is determined
          </Text>
          <View className="flex-row gap-2">
            {([
              { mode: 'light' as const, icon: Icons.LIGHT_MODE, label: 'Light' },
              { mode: 'dark' as const, icon: Icons.DARK_MODE, label: 'Dark' },
              { mode: 'system' as const, icon: Icons.SYSTEM_MODE_OUTLINE, label: 'System' },
            ]).map(({ mode, icon, label }) => (
              <HapticTouchableOpacity
                key={mode}
                onPress={() => setThemeMode(mode)}
                className={`flex-1 py-2 px-3 rounded-lg border ${
                  themeMode === mode
                    ? ''
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}
                style={themeMode === mode ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary, borderColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
              >
                <View className="items-center">
                  <Icon
                    name={icon}
                    size={IconSizes.XS}
                    color={themeMode === mode ? '#FFFFFF' : (theme === 'dark' ? '#D1D5DB' : '#6B7280')}
                    accessibilityLabel={label}
                  />
                  <Text className={`text-center font-medium mt-1 ${
                    themeMode === mode ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                  }`}>
                    {label}
                  </Text>
                </View>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
