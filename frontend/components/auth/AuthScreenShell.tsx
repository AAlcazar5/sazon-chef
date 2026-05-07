// frontend/components/auth/AuthScreenShell.tsx
// ROADMAP 4.0 A7.3 — Shared chrome for auth screens (login / signup /
// future forgot-password).
//
// Eliminates the ~80 lines of identical scaffolding (gradient + safe-area
// + keyboard avoid + scroll + max-width + title + form-error block) that
// login.tsx + register.tsx duplicated. Each consumer renders its form body
// + actions row as `children`; everything else lives here.
//
// Per A7.1 design spec: Fraunces display headline, hero-size mascot when
// present, lifestyle copy under the headline.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import ScreenGradient from '../ui/ScreenGradient';
import AnimatedAuthGradient from './AnimatedAuthGradient';
import KeyboardAvoidingContainer from '../ui/KeyboardAvoidingContainer';
import Sazon, {
  type SazonVariant,
  type SazonMotion,
  type SazonFx,
} from '../mascot/Sazon';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { FontSize } from '../../constants/Typography';

export interface AuthScreenShellProps {
  /** Display-weight headline ("Welcome back" / "Let's set up your kitchen"). */
  headline: string;
  /** Optional muted subhead under the headline. */
  subhead?: string;
  /**
   * Mascot block above the headline. Omit to hide entirely (the original
   * register screen had no mascot block — A7.1 + A7.2 add a uniform one).
   */
  mascot?: {
    variant?: SazonVariant;
    motion?: SazonMotion;
    fx?: SazonFx[];
    /** Pixel size; defaults to 96. Spec says "hero" → 120 for prominence. */
    size?: number;
  };
  /** Form-level error message; renders the pastel-red mascot bubble. */
  formError?: string;
  /** Optional success-flash overlay (post-submit excited mascot). */
  successFlash?: {
    motion: SazonMotion;
    fx: SazonFx[];
    /** Default 256. */
    size?: number;
  };
  /** Form body — inputs, action button(s), social row, links. */
  children: React.ReactNode;
  /** When true, headline uses Fraunces. Default true (per A7 spec). */
  serifHeadline?: boolean;
  /** Test id for the outer container. */
  testID?: string;
  /** When true (default), wraps the gradient in `<AnimatedAuthGradient>`
   *  for the A7.5 slow-pulse. Set false to render the static gradient
   *  (e.g., when a parent surface already animates). */
  animatedGradient?: boolean;
}

const HERO_MASCOT_SIZE = 120;

export default function AuthScreenShell({
  headline,
  subhead,
  mascot,
  formError,
  successFlash,
  children,
  serifHeadline = true,
  testID,
  animatedGradient = true,
}: AuthScreenShellProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const headlineColor = isDark ? DarkColors.text.primary : Colors.primary;
  const subheadColor = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const mascotBg = isDark ? PastelDark.peach : Pastel.orange;
  const errorBg = isDark ? PastelDark.red : Pastel.red;
  const errorText = isDark ? '#F87171' : '#B91C1C';

  const Gradient = animatedGradient ? AnimatedAuthGradient : ScreenGradient;
  const gradientProps = animatedGradient ? {} : { variant: 'auth' as const };

  return (
    <Gradient {...gradientProps}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Success flash overlay — caller-controlled visibility */}
        {successFlash ? (
          <MotiView
            from={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 300 }}
            pointerEvents="none"
            style={styles.successFlash}
          >
            <Sazon
              variant="orange"
              motion={successFlash.motion}
              fx={successFlash.fx}
              size={successFlash.size ?? 256}
            />
          </MotiView>
        ) : null}

        <KeyboardAvoidingContainer>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            testID={testID}
          >
            <View style={styles.column}>
              {/* Mascot (optional) */}
              {mascot ? (
                <MotiView
                  from={{ opacity: 0, translateY: -20, scale: 0.7 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  transition={{ type: 'spring', delay: 0, damping: 14, stiffness: 200 }}
                >
                  <View
                    testID="auth-shell-mascot"
                    style={[
                      styles.mascotCard,
                      { backgroundColor: mascotBg },
                      Shadows.SM as any,
                    ]}
                  >
                    <Sazon
                      variant={mascot.variant ?? 'orange'}
                      motion={mascot.motion ?? 'idle'}
                      fx={mascot.fx ?? []}
                      size={mascot.size ?? HERO_MASCOT_SIZE}
                    />
                  </View>
                </MotiView>
              ) : null}

              {/* Headline + subhead */}
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 80, damping: 20, stiffness: 180 }}
              >
                <Text
                  testID="auth-shell-headline"
                  accessibilityRole="header"
                  accessibilityLabel={headline}
                  style={[
                    styles.headline,
                    serifHeadline ? styles.headlineFraunces : styles.headlineSans,
                    { color: headlineColor },
                  ]}
                >
                  {headline}
                </Text>
                {subhead ? (
                  <Text
                    testID="auth-shell-subhead"
                    style={[styles.subhead, { color: subheadColor }]}
                  >
                    {subhead}
                  </Text>
                ) : null}
              </MotiView>

              {/* Form-level error bubble */}
              {formError ? (
                <MotiView
                  from={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 16, stiffness: 240 }}
                >
                  <View
                    testID="auth-shell-form-error"
                    accessibilityRole="alert"
                    accessibilityLabel={formError}
                    style={[
                      styles.errorBubble,
                      { backgroundColor: errorBg },
                      Shadows.SM as any,
                    ]}
                  >
                    <Sazon variant="orange" motion="wobble" fx={['question']} size={24} />
                    <Text style={[styles.errorText, { color: errorText }]}>
                      {formError}
                    </Text>
                  </View>
                </MotiView>
              ) : null}

              {/* Form body — caller's responsibility */}
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingContainer>
      </SafeAreaView>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  successFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  column: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  mascotCard: {
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 24,
    paddingVertical: 20,
  },
  headline: {
    fontSize: FontSize['3xl'],
    textAlign: 'center',
    marginBottom: 4,
  },
  headlineSans: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  headlineFraunces: {
    fontFamily: 'Fraunces_700Bold',
  },
  subhead: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBubble: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
});
