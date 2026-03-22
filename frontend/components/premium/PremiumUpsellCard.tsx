// frontend/components/premium/PremiumUpsellCard.tsx
// Dark gradient premium upsell card for placement in the home recipe feed.
// Only visible to free-tier users. Matches CoffeeBanner redesign aesthetic.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { SazonMascot } from '../mascot';
import { Shadows } from '../../constants/Shadows';

interface PremiumUpsellCardProps {
  testID?: string;
}

export default function PremiumUpsellCard({ testID }: PremiumUpsellCardProps) {
  return (
    <HapticTouchableOpacity
      onPress={() => router.push('/paywall' as any)}
      hapticStyle="light"
      scaleOnPress
      testID={testID}
    >
      <LinearGradient
        colors={['#1A1A2E', '#2D1B4E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.content}>
          <Text style={styles.headline}>Unlock unlimited recipes</Text>
          <Text style={styles.subtext}>
            Get personalized meal plans, advanced macros, and more.
          </Text>
          <View style={styles.ctaPill}>
            <Text style={styles.ctaText}>See Plans →</Text>
          </View>
        </View>
        <View style={styles.mascotContainer}>
          <SazonMascot expression="excited" size="small" />
        </View>
      </LinearGradient>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    ...Shadows.LG,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  headline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
    marginBottom: 12,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(250,126,18,0.2)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(250,126,18,0.4)',
  },
  ctaText: {
    color: '#FF9F43',
    fontSize: 13,
    fontWeight: '700',
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
