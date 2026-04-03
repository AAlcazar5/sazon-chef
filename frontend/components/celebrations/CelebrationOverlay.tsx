// frontend/components/celebrations/CelebrationOverlay.tsx
// Reusable full-screen celebration overlay with confetti, mascot, and stats.
// Used for cooking complete, shopping complete, and paywall conversion peaks.

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedLottieMascot from '../mascot/AnimatedLottieMascot';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import type { LogoMascotExpression } from '../mascot/LogoMascot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Confetti config
const CONFETTI_COUNT = 24;
const CONFETTI_COLORS = ['#FB923C', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];
const CONFETTI_SHAPES = ['●', '■', '▲', '★', '♦', '◆'];

interface StatCard {
  value: string;
  label: string;
  color: string;
  bgColor: string;
}

interface CTAButton {
  label: string;
  onPress: () => void;
  gradient?: [string, string];
}

interface CelebrationOverlayProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  expression?: LogoMascotExpression;
  stats?: StatCard[];
  primaryCTA?: CTAButton;
  secondaryCTA?: CTAButton;
  autoDismiss?: number; // ms, 0 = no auto-dismiss
  onDismiss?: () => void;
  children?: React.ReactNode;
}

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  shape: string;
  size: number;
  startX: number;
}

export default function CelebrationOverlay({
  visible,
  title,
  subtitle,
  expression = 'chef-kiss',
  stats,
  primaryCTA,
  secondaryCTA,
  autoDismiss = 0,
  onDismiss,
  children,
}: CelebrationOverlayProps) {
  // Background
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // Content card
  const contentScale = useRef(new Animated.Value(0.6)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Stats stagger
  const statAnims = useRef(
    Array.from({ length: 4 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // CTA
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaTranslateY = useRef(new Animated.Value(20)).current;

  // Confetti pieces
  const confetti = useRef<ConfettiPiece[]>(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
      size: 8 + Math.random() * 10,
      startX: Math.random() * SCREEN_WIDTH,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Reset all values
    bgOpacity.setValue(0);
    contentScale.setValue(0.6);
    contentOpacity.setValue(0);
    ctaOpacity.setValue(0);
    ctaTranslateY.setValue(20);
    statAnims.forEach((a) => { a.scale.setValue(0); a.opacity.setValue(0); });
    confetti.forEach((c) => {
      c.x.setValue(0);
      c.y.setValue(-20);
      c.rotate.setValue(0);
      c.opacity.setValue(0);
    });

    // 1. Background fade
    Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // 2. Confetti burst — staggered rain from top
    confetti.forEach((c, i) => {
      const delay = Math.random() * 400;
      const duration = 1200 + Math.random() * 800;
      const drift = (Math.random() - 0.5) * 120;

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(c.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(c.y, {
            toValue: SCREEN_HEIGHT + 40,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(c.x, {
            toValue: drift,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(c.rotate, {
            toValue: (Math.random() - 0.5) * 8,
            duration,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Fade out at end
        Animated.timing(c.opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      });
    });

    // 3. Content card spring-in (at 200ms)
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(contentScale, { toValue: 1, friction: 6, tension: 180, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();

    // 4. Stats stagger (at 500ms)
    if (stats && stats.length > 0) {
      stats.forEach((_, i) => {
        if (i < statAnims.length) {
          Animated.sequence([
            Animated.delay(500 + i * 100),
            Animated.parallel([
              Animated.spring(statAnims[i].scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
              Animated.timing(statAnims[i].opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]),
          ]).start();
        }
      });
    }

    // 5. CTA fade-in (at 800ms)
    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(ctaTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    // Auto-dismiss
    if (autoDismiss > 0 && onDismiss) {
      const timer = setTimeout(() => {
        Animated.timing(bgOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          onDismiss();
        });
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark overlay */}
      <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
        {/* Confetti rain */}
        {confetti.map((c, i) => (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute',
              left: c.startX,
              top: -20,
              fontSize: c.size,
              color: c.color,
              opacity: c.opacity,
              transform: [
                { translateX: c.x },
                { translateY: c.y },
                { rotate: c.rotate.interpolate({
                  inputRange: [-4, 4],
                  outputRange: ['-360deg', '360deg'],
                }) },
              ],
            }}
          >
            {c.shape}
          </Animated.Text>
        ))}

        {/* Main content */}
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: contentScale }],
              opacity: contentOpacity,
            },
          ]}
        >
          {/* Mascot */}
          <AnimatedLottieMascot
            expression={expression}
            size="large"
            animationType="celebrate"
          />

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Subtitle */}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* Stat cards */}
          {stats && stats.length > 0 && (
            <View style={styles.statsRow}>
              {stats.map((stat, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.statCard,
                    { backgroundColor: stat.bgColor },
                    i < statAnims.length && {
                      transform: [{ scale: statAnims[i].scale }],
                      opacity: statAnims[i].opacity,
                    },
                  ]}
                >
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Custom children */}
          {children}

          {/* CTAs */}
          <Animated.View style={{ opacity: ctaOpacity, transform: [{ translateY: ctaTranslateY }], width: '100%', alignItems: 'center' }}>
            {primaryCTA && (
              <HapticTouchableOpacity
                onPress={primaryCTA.onPress}
                hapticStyle="medium"
                style={styles.primaryCTAWrapper}
              >
                <LinearGradient
                  colors={primaryCTA.gradient || ['#FB923C', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryCTA}
                >
                  <Text style={styles.primaryCTAText}>{primaryCTA.label}</Text>
                </LinearGradient>
              </HapticTouchableOpacity>
            )}

            {secondaryCTA && (
              <HapticTouchableOpacity
                onPress={secondaryCTA.onPress}
                hapticStyle="light"
                style={styles.secondaryCTA}
              >
                <Text style={styles.secondaryCTAText}>{secondaryCTA.label}</Text>
              </HapticTouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 80,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryCTAWrapper: {
    marginTop: 28,
    borderRadius: 100,
    overflow: 'hidden',
  },
  primaryCTA: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 100,
  },
  primaryCTAText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
  },
  secondaryCTA: {
    marginTop: 12,
    paddingVertical: 10,
  },
  secondaryCTAText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
});
