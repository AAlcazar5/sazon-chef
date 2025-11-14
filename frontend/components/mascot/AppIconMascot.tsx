import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import SazonMascot from './SazonMascot';

/**
 * App Icon Mascot Component
 * 
 * This component renders the Sazon mascot optimized for app icon use.
 * The mascot is rendered at a size suitable for app icons (typically 1024x1024 for iOS, 512x512 for Android).
 * 
 * To generate actual PNG icon files:
 * 1. Use this component in a standalone screen or tool
 * 2. Take a screenshot or use a tool like react-native-view-shot to export as PNG
 * 3. Resize to required icon sizes:
 *    - iOS: 1024x1024 (single size, iOS scales automatically)
 *    - Android: 512x512 (foreground), various sizes for adaptive icon
 *    - Web: 512x512 (favicon)
 * 
 * Recommended expression: 'happy' or 'excited' for app icon
 * Recommended variant: 'orange' (brand color)
 */
interface AppIconMascotProps {
  size?: number; // Icon size in pixels (default: 1024 for iOS)
  expression?: 'happy' | 'excited' | 'proud';
  variant?: 'orange' | 'red';
  backgroundColor?: string; // Background color for the icon (default: white or brand orange)
}

export default function AppIconMascot({
  size = 1024,
  expression = 'happy',
  variant = 'orange',
  backgroundColor = '#FFFFFF',
}: AppIconMascotProps) {
  // Calculate mascot size - should be about 80% of icon size to leave padding
  const mascotSize = size * 0.8;
  
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius: size * 0.2, // Rounded corners for modern app icons
        },
      ]}
    >
      <View
        style={{
          width: mascotSize,
          height: mascotSize,
        }}
      >
        <SazonMascot
          expression={expression}
          size="hero" // Use hero size and scale it
          variant={variant}
          style={{
            width: mascotSize,
            height: mascotSize,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});

/**
 * Icon Generation Guide:
 * 
 * 1. Create a temporary screen that renders AppIconMascot at 1024x1024
 * 2. Use react-native-view-shot or similar to capture as PNG
 * 3. Generate required sizes:
 *    - icon.png: 1024x1024 (iOS)
 *    - android-icon-foreground.png: 1024x1024 (Android adaptive icon foreground)
 *    - android-icon-background.png: 1024x1024 (Android adaptive icon background - solid color)
 *    - android-icon-monochrome.png: 1024x1024 (Android monochrome icon - grayscale)
 *    - favicon.png: 512x512 (Web favicon)
 *    - splash-icon.png: 200x200 (Splash screen - already exists)
 * 
 * Alternative: Use design tools (Figma, Sketch) to create icon from mascot SVG
 */

