// frontend/contexts/ThemeContext.tsx
// Theme management context for dark/light mode

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance, ColorSchemeName, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, DarkColors } from '../constants/Colors';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  systemColorScheme: ColorSchemeName;
  colors: typeof Colors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@sazon_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useNativeWindColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // Determine actual theme based on mode and system preference
  const actualTheme: 'light' | 'dark' = themeMode === 'system' 
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themeMode;

  // Get colors based on current theme
  const colors = actualTheme === 'dark' ? DarkColors : Colors;

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    // Get initial system color scheme
    setSystemColorScheme(Appearance.getColorScheme());

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Sync with NativeWind's colorScheme
  useEffect(() => {
    if (themeMode === 'system') {
      setColorScheme('system');
    } else {
      setColorScheme(themeMode);
    }
  }, [themeMode, setColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      // Smooth fade out transition
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        // Update theme
        setThemeModeState(mode);
        // Immediately update NativeWind's colorScheme
        if (mode === 'system') {
          setColorScheme('system');
        } else {
          setColorScheme(mode);
        }
        // Smooth fade in transition
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
      
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
      // Reset animation on error
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [setColorScheme, fadeAnim]);

  const toggleTheme = useCallback(async () => {
    // Toggle between light and dark, regardless of current mode
    const currentTheme = actualTheme;
    const newMode = currentTheme === 'dark' ? 'light' : 'dark';
    await setThemeMode(newMode);
  }, [actualTheme, setThemeMode]);

  if (isLoading) {
    // Return with default theme while loading
    return (
      <ThemeContext.Provider
        value={{
          theme: 'light',
          themeMode: 'system',
          systemColorScheme: 'light',
          colors: Colors,
          setThemeMode,
          toggleTheme,
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ThemeContext.Provider
        value={{
          theme: actualTheme,
          themeMode,
          systemColorScheme,
          colors,
          setThemeMode,
          toggleTheme,
        }}
      >
        {children}
      </ThemeContext.Provider>
    </Animated.View>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

