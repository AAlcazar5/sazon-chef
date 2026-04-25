import React from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EditorialShadows } from '../../constants/Shadows';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

interface SurpriseFABProps {
  onPress: () => void;
}

export function SurpriseFAB({ onPress }: SurpriseFABProps) {
  const shadowStyle = Platform.select({
    ios: EditorialShadows.fab.ios,
    android: EditorialShadows.fab.android,
    default: {},
  });

  const handlePress = () => {
    triggerHaptic(ImpactStyle.MEDIUM);
    onPress();
  };

  return (
    <Pressable
      testID="surprise-fab"
      onPress={handlePress}
      style={[styles.container, shadowStyle]}
      accessibilityLabel="Surprise me with a random recipe"
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['#fa7e12', '#d67a0c']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Ionicons name="sparkles" size={24} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
  },
});
