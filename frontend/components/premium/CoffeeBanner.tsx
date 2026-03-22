// frontend/components/premium/CoffeeBanner.tsx
// Premium-styled "Support Sazon" banner shown to free-tier users after key moments.
// Frequency-capped to once per 7 days via AsyncStorage.
// Never shown to Premium or trialing subscribers.
// Redesigned as a rich dark gradient card with mascot illustration.

import React from 'react';
import { View, Text, Modal, Linking, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { SazonMascot } from '../mascot';
import { useSubscription } from '../../hooks/useSubscription';
import { Shadows } from '../../constants/Shadows';
import { Backdrop } from '../../constants/Colors';

const STORAGE_KEY = 'lastCoffeeBannerShown';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COFFEE_URL = 'https://ko-fi.com/sazonchef'; // Replace with actual Ko-fi / BMAC URL

interface CoffeeBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export function CoffeeBanner({ visible, onDismiss }: CoffeeBannerProps) {
  const { subscription } = useSubscription();

  // Never render for premium / trialing users
  if (subscription.isPremium) return null;

  const handleSupport = async () => {
    await Linking.openURL(COFFEE_URL);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: Backdrop.light }]}>
        <View style={styles.cardWrapper}>
          <LinearGradient
            colors={['#1A1A2E', '#2D1B4E', '#1A1A2E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Mascot on the right */}
            <View style={styles.mascotContainer}>
              <SazonMascot expression="chef-kiss" size="small" />
            </View>

            {/* Content on the left */}
            <View style={styles.content}>
              <Text style={styles.headline}>
                Unlock the full menu
              </Text>
              <Text style={styles.subtext}>
                Keep Sazon cooking with a small coffee — it goes a long way.
              </Text>

              {/* CTA Button with shimmer-like gradient */}
              <HapticTouchableOpacity
                onPress={handleSupport}
                hapticStyle="medium"
                style={styles.ctaWrapper}
              >
                <LinearGradient
                  colors={['#fa7e12', '#FF9F43']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaButton}
                >
                  <Text style={styles.ctaText}>Support Sazon ☕</Text>
                </LinearGradient>
              </HapticTouchableOpacity>
            </View>
          </LinearGradient>

          {/* Dismiss */}
          <HapticTouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            hapticDisabled
          >
            <Text style={styles.dismissText}>Maybe later</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.LG,
  },
  content: {
    flex: 1,
    marginRight: 16,
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    marginBottom: 16,
  },
  ctaWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dismissButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});

/**
 * Check whether the coffee banner should be shown, respecting the 7-day cooldown.
 * Call this before showing the banner at trigger points.
 */
export async function shouldShowCoffeeBanner(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const last = parseInt(raw, 10);
    return Date.now() - last >= COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * Record that the banner was shown. Call this when the banner becomes visible.
 */
export async function recordCoffeeBannerShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // silently ignore
  }
}
