import React from 'react';
import { View, StyleSheet, ViewStyle, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '../../constants/Colors';

interface GradientBorderProps {
  children: React.ReactNode;
  borderWidth?: number;
  borderRadius?: number;
  gradient?: string[];
  style?: ViewStyle;
  className?: string;
  innerBackgroundColor?: string; // Background color for inner content (defaults to transparent)
}

export default function GradientBorder({
  children,
  borderWidth = 2,
  borderRadius = 8,
  gradient = Gradients.rainbow as any,
  style,
  className,
  innerBackgroundColor,
}: GradientBorderProps) {
  const colorScheme = useColorScheme();
  // For transparent buttons, use screen background to hide gradient while appearing transparent
  const backgroundColor = innerBackgroundColor === 'transparent' 
    ? (colorScheme === 'dark' ? '#111827' : '#FFFFFF') // Screen background colors
    : (innerBackgroundColor || (colorScheme === 'dark' ? '#1F2937' : '#FFFFFF'));
  
  return (
    <View style={[style, { position: 'relative', overflow: 'hidden' }]} className={className}>
      {/* Outer gradient layer */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
          },
        ]}
      />
      {/* Inner layer to create border effect */}
      <View
        style={{
          margin: borderWidth,
          borderRadius: borderRadius - borderWidth,
          backgroundColor: backgroundColor,
        }}
      >
        {children}
      </View>
    </View>
  );
}

