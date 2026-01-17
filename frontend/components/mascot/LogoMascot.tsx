import React from 'react';
import { View, StyleSheet, ImageStyle } from 'react-native';
import { Image } from 'expo-image';

export type LogoMascotSize = 'tiny' | 'xsmall' | 'small' | 'medium' | 'large' | 'hero';
export type LogoMascotExpression = 'happy' | 'excited' | 'curious' | 'proud' | 'supportive' | 'celebrating' | 'thinking' | 'surprised' | 'winking' | 'focused' | 'sleepy' | 'chef-kiss';

interface LogoMascotProps {
  size?: LogoMascotSize;
  expression?: LogoMascotExpression;
  style?: ImageStyle | ImageStyle[];
}

const SIZE_MAP: Record<LogoMascotSize, number> = {
  tiny: 24,
  xsmall: 36,  // Matches text-2xl emoji visual size
  small: 48,
  medium: 96,
  large: 192,
  hero: 256,
};

// Map expressions to file names
// Using the base logo for all expressions (no expression-specific variants)
// Using PNG for better quality rendering (SVG can appear blurry in React Native)
const BASE_LOGO_ORANGE = require('./sazon-chef-logo-orange.png');
const BASE_LOGO_RED = require('./sazon-chef-logo-red.png');

const EXPRESSION_MAP: Record<LogoMascotExpression, any> = {
  happy: BASE_LOGO_ORANGE,
  excited: BASE_LOGO_ORANGE,
  curious: BASE_LOGO_ORANGE,
  proud: BASE_LOGO_ORANGE,
  supportive: BASE_LOGO_ORANGE,
  celebrating: BASE_LOGO_ORANGE,
  thinking: BASE_LOGO_ORANGE,
  surprised: BASE_LOGO_ORANGE,
  winking: BASE_LOGO_ORANGE,
  focused: BASE_LOGO_ORANGE,
  sleepy: BASE_LOGO_ORANGE,
  'chef-kiss': BASE_LOGO_ORANGE,
};

export default function LogoMascot({
  size = 'medium',
  expression = 'happy',
  style,
}: LogoMascotProps) {
  const dimensions = SIZE_MAP[size];
  
  // Get the appropriate logo file for the expression
  const imageSource = EXPRESSION_MAP[expression];
  
  // Larger image size to crop white space edges (20% larger to remove padding)
  const imageSize = dimensions * 1.2;

  return (
    <View style={[styles.container, { width: dimensions, height: dimensions }, style]}>
      <Image
        source={imageSource}
        style={[styles.image, { width: imageSize, height: imageSize }]}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        recyclingKey={expression}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Crop any white space around the image
  },
  image: {
    // Image will scale to fit dimensions
  },
});
