// frontend/components/celebrations/PremiumCelebration.tsx
// Full-screen "Welcome to Premium!" celebration overlay.
// Shown after successful Stripe checkout / subscription activation.

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import CelebrationOverlay from './CelebrationOverlay';

const PREMIUM_BENEFITS = [
  { emoji: '♾️', text: 'Unlimited recipes unlocked' },
  { emoji: '🧠', text: 'AI meal planning active' },
  { emoji: '🛒', text: 'Smart shopping lists' },
  { emoji: '📊', text: 'Advanced nutrition insights' },
];

interface PremiumCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function PremiumCelebration({ visible, onDismiss }: PremiumCelebrationProps) {
  const benefitAnims = useRef(
    PREMIUM_BENEFITS.map(() => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(-20),
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    benefitAnims.forEach((a) => {
      a.opacity.setValue(0);
      a.translateX.setValue(-20);
    });

    // Stagger benefits entrance at 600ms
    benefitAnims.forEach((a, i) => {
      Animated.sequence([
        Animated.delay(600 + i * 120),
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(a.translateX, { toValue: 0, friction: 8, tension: 120, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, [visible]);

  return (
    <CelebrationOverlay
      visible={visible}
      title="Welcome to Premium!"
      subtitle="You've unlocked the full Sazon experience"
      expression="celebrating"
      autoDismiss={4000}
      onDismiss={onDismiss}
      primaryCTA={{
        label: "Let's Cook!",
        onPress: onDismiss,
        gradient: ['#8B5CF6', '#6366F1'],
      }}
    >
      {/* Staggered benefits list */}
      <View style={styles.benefitsList}>
        {PREMIUM_BENEFITS.map((benefit, i) => (
          <Animated.View
            key={i}
            style={[
              styles.benefitRow,
              {
                opacity: benefitAnims[i].opacity,
                transform: [{ translateX: benefitAnims[i].translateX }],
              },
            ]}
          >
            <Text style={styles.benefitEmoji}>{benefit.emoji}</Text>
            <Text style={styles.benefitText}>{benefit.text}</Text>
          </Animated.View>
        ))}
      </View>
    </CelebrationOverlay>
  );
}

const styles = StyleSheet.create({
  benefitsList: {
    marginTop: 20,
    gap: 10,
    width: '100%',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  benefitEmoji: {
    fontSize: 18,
    marginRight: 12,
  },
  benefitText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
  },
});
