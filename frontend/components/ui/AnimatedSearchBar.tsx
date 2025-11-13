import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

interface AnimatedSearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  defaultValue?: string;
  collapsedWidth?: number;
  expandedWidth?: number;
  duration?: number;
  style?: any;
}

export default function AnimatedSearchBar({
  placeholder = 'Search...',
  onSearch,
  onFocus,
  onBlur,
  defaultValue = '',
  collapsedWidth = 60,
  expandedWidth = 300,
  duration = 300,
  style,
}: AnimatedSearchBarProps) {
  const { colorScheme } = useColorScheme();
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState(defaultValue);
  const width = useRef(new Animated.Value(collapsedWidth)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      // Expand
      Animated.parallel([
        Animated.timing(width, {
          toValue: expandedWidth,
          duration,
          useNativeDriver: false, // width requires layout
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration * 0.7, // Faster fade in
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Collapse
      Animated.parallel([
        Animated.timing(width, {
          toValue: collapsedWidth,
          duration,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.5, // Faster fade out
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFocused, width, opacity, expandedWidth, collapsedWidth, duration]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    setQuery('');
    onSearch?.('');
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    onSearch?.(text);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width,
          backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
          style={styles.icon}
        />
        <Animated.View style={[styles.inputContainer, { opacity }]}>
          <TextInput
            value={query}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
            style={[
              styles.input,
              {
                color: colorScheme === 'dark' ? '#F9FAFB' : '#111827',
              },
            ]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

