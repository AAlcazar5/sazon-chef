// frontend/components/premium/PremiumUpsellCard.tsx
// Editorial-styled premium upsell — pastel surface, italic accent headline, black CTA pill.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { LogoMascot } from '../mascot';
import { Pastel, EditorialColors } from '../../constants/Colors';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';

interface PremiumUpsellCardProps {
  testID?: string;
}

export default function PremiumUpsellCard({ testID }: PremiumUpsellCardProps) {
  const shadow = Platform.OS === 'ios' ? EditorialShadows.cardRaised.ios : EditorialShadows.cardRaised.android;

  return (
    <HapticTouchableOpacity
      onPress={() => router.push('/paywall' as any)}
      hapticStyle="light"
      scaleOnPress
      testID={testID}
      style={styles.wrapper}
    >
      <View style={[styles.card, shadow]}>
        <Text style={styles.eyebrow}>PREMIUM · LIMITED OFFER</Text>

        <View style={styles.row}>
          <View style={styles.content}>
            <Text style={styles.headline}>
              Unlock unlimited{' '}
              <Text style={styles.headlineAccent}>recipes</Text>
            </Text>
            <Text style={styles.subtext}>
              Personalized meal plans, advanced macros, smart pantry matching — all yours.
            </Text>

            <View style={styles.cta}>
              <Text style={styles.ctaText}>See plans</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.mascotContainer}>
            <LogoMascot expression="excited" size="small" />
          </View>
        </View>
      </View>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  card: {
    backgroundColor: Pastel.lavender,
    borderRadius: 22,
    padding: 20,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#fa7e12',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  headline: {
    ...EditorialTypography.sectionTitle,
    fontSize: 22,
    color: EditorialColors.pastelTitle.lavender,
    marginBottom: 6,
  },
  headlineAccent: {
    ...EditorialTypography.sectionAccent,
    fontSize: 22,
    color: EditorialColors.pastelTitle.lavender,
  },
  subtext: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
    marginBottom: 14,
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: EditorialColors.blackCTA,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  ctaText: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
