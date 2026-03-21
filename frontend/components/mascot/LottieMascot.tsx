import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import SazonMascot, { SazonExpression, SazonSize, SazonVariant } from './SazonMascot';

// Map of available Lottie assets per expression
// When a Lottie JSON is added, import it here and add to the map
// Falls back to SVG SazonMascot when no Lottie asset exists
const LOTTIE_ASSETS: Partial<Record<SazonExpression, any>> = {
  // Uncomment and add imports as Lottie files become available:
  // excited: require('./lottie/excited.json'),
  // thinking: require('./lottie/thinking.json'),
  // 'chef-kiss': require('./lottie/chef-kiss.json'),
  // celebrating: require('./lottie/celebrating.json'),
  // sleepy: require('./lottie/sleeping.json'),
  // happy: require('./lottie/waving.json'),
};

const SIZE_MAP: Record<SazonSize, number> = {
  tiny: 24,
  small: 48,
  medium: 96,
  large: 192,
  hero: 256,
};

interface LottieMascotProps {
  expression?: SazonExpression;
  size?: SazonSize;
  variant?: SazonVariant;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: any;
}

export default function LottieMascot({
  expression = 'happy',
  size = 'medium',
  variant = 'orange',
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
}: LottieMascotProps) {
  const lottieRef = useRef<LottieView>(null);
  const lottieSource = LOTTIE_ASSETS[expression];
  const dimensions = SIZE_MAP[size];

  useEffect(() => {
    if (lottieSource && autoPlay && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [lottieSource, autoPlay]);

  // Fall back to SVG SazonMascot when no Lottie asset exists
  if (!lottieSource) {
    return (
      <SazonMascot
        expression={expression}
        size={size}
        variant={variant}
        style={style}
      />
    );
  }

  return (
    <View style={[styles.container, { width: dimensions, height: dimensions }, style]}>
      <LottieView
        ref={lottieRef}
        source={lottieSource}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: dimensions, height: dimensions }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
