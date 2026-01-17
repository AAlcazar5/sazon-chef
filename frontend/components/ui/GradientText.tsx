import React from 'react';
import { Text, TextStyle, Platform, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Gradients } from '../../constants/Colors';

interface GradientTextProps {
  children: string | React.ReactNode;
  style?: TextStyle;
  className?: string;
  gradient?: string[];
}

export default function GradientText({
  children,
  style,
  className,
  gradient,
}: GradientTextProps) {
  const colorScheme = useColorScheme();
  const text = typeof children === 'string' ? children : String(children);
  
  // Use color-scheme appropriate gradient if none provided
  const selectedGradient = gradient || (colorScheme === 'dark' 
    ? Gradients.rainbowBright as any 
    : Gradients.rainbowBrightLight as any);
  
  // Adjust text shadow based on color scheme
  const textShadow = colorScheme === 'dark'
    ? {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }
    : {
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      };
  
  // Use MaskedView for gradient text on native platforms
  if (Platform.OS !== 'web') {
    return (
      <MaskedView
        maskElement={
          <Text 
            style={[style, textShadow]} 
            className={className}
          >
            {text}
          </Text>
        }
      >
        <LinearGradient
          colors={selectedGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text 
            style={[style, { opacity: 0 }, textShadow]} 
            className={className}
          >
            {text}
          </Text>
        </LinearGradient>
      </MaskedView>
    );
  }
  
  // Web fallback - use first gradient color with shadow
  return (
    <Text 
      style={[style, { color: selectedGradient[0] }, textShadow]} 
      className={className}
    >
      {text}
    </Text>
  );
}

