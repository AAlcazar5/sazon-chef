// frontend/app/tonight.tsx
// ROADMAP 4.0 T2.1 — Tonight Mode hero screen.
//
// One screen, one gesture: hero image + copy line + "Cook this" CTA.
// Long-press hero → swap sheet. "More" affordance opens (tabs) stack.
// Loading uses Sazon thinking mascot via LoadingState (no ActivityIndicator).
// Errors use Sazon personality copy (no "Error:" / "Failed to" / "Invalid").

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import LoadingState from '../components/ui/LoadingState';
import ScreenGradient from '../components/ui/ScreenGradient';
import TonightSwapSheet from '../components/tonight/TonightSwapSheet';
import { apiClient } from '../lib/api';
import {
  trackTonightProposalShown,
  trackTonightProposalAccepted,
  trackTonightProposalSwapped,
  trackTonightProposalEscaped,
} from '../lib/analytics';
import { BorderRadius, Spacing } from '../constants/Spacing';
import type { Recipe } from '../types';

const { height } = Dimensions.get('window');

interface TonightProposal {
  recipe: Recipe;
  copyLine: string;
  alternatives: Recipe[];
  context?: { pantryHits?: number; pantryCoveragePct?: number };
}

export default function TonightScreen() {
  const router = useRouter();
  const [proposal, setProposal] = useState<TonightProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swapVisible, setSwapVisible] = useState(false);
  const requestStartedAt = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    requestStartedAt.current = Date.now();
    apiClient
      .post('/tonight/proposal', {})
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data as TonightProposal;
        setProposal(data);
        const latency = Date.now() - requestStartedAt.current;
        trackTonightProposalShown({
          proposalLatencyMs: latency,
          pantryCoveragePct: data?.context?.pantryCoveragePct ?? null,
          recipeId: data?.recipe?.id ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError('Sazon is thinking — let’s try again in a moment.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onCookThis = () => {
    if (!proposal) return;
    trackTonightProposalAccepted({
      proposalLatencyMs: Date.now() - requestStartedAt.current,
      pantryCoveragePct: proposal.context?.pantryCoveragePct ?? null,
      recipeId: proposal.recipe.id,
    });
    router.push(`/cooking?recipeId=${proposal.recipe.id}` as any);
  };

  const onSwap = (recipeId: string) => {
    trackTonightProposalSwapped({
      proposalLatencyMs: Date.now() - requestStartedAt.current,
      pantryCoveragePct: proposal?.context?.pantryCoveragePct ?? null,
      fromRecipeId: proposal?.recipe.id ?? null,
      toRecipeId: recipeId,
    });
    setSwapVisible(false);
    router.push(`/cooking?recipeId=${recipeId}` as any);
  };

  const onMore = () => {
    trackTonightProposalEscaped({
      proposalLatencyMs: Date.now() - requestStartedAt.current,
      pantryCoveragePct: proposal?.context?.pantryCoveragePct ?? null,
    });
    router.push('/(tabs)' as any);
  };

  if (!proposal && !error) {
    return (
      <ScreenGradient>
        <View style={styles.center}>
          <LoadingState expression="thinking" message="Sazon is choosing tonight…" />
        </View>
      </ScreenGradient>
    );
  }

  if (error) {
    return (
      <ScreenGradient>
        <View style={styles.center}>
          <Text style={styles.errorCopy} accessibilityLabel="Sazon retry message">
            {error}
          </Text>
          <HapticTouchableOpacity
            accessibilityLabel="Try Sazon again"
            pressedScale={0.97}
            style={styles.retry}
            onPress={() => {
              setError(null);
              requestStartedAt.current = Date.now();
              apiClient
                .post('/tonight/proposal', {})
                .then((res: any) => setProposal(res?.data))
                .catch(() => setError('Sazon is thinking — let’s try again in a moment.'));
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </HapticTouchableOpacity>
        </View>
      </ScreenGradient>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        testID="tonight-hero"
        accessibilityLabel="Long-press to see alternatives"
        style={styles.hero}
        onLongPress={() => setSwapVisible(true)}
        delayLongPress={350}
      >
        <ImageBackground
          source={{ uri: proposal!.recipe.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']}
            style={styles.gradient}
          >
            <View style={styles.copyBlock}>
              <Text style={styles.copyLine}>{proposal!.copyLine}</Text>
              <Text style={styles.recipeTitle}>{proposal!.recipe.title}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>

      <View style={styles.ctaRow}>
        <HapticTouchableOpacity
          accessibilityLabel="Cook this tonight"
          pressedScale={0.97}
          style={styles.cta}
          onPress={onCookThis}
        >
          <Text style={styles.ctaText}>Cook this.</Text>
        </HapticTouchableOpacity>

        <HapticTouchableOpacity
          accessibilityLabel="More options"
          pressedScale={0.97}
          style={styles.more}
          onPress={onMore}
        >
          <Text style={styles.moreText}>More</Text>
        </HapticTouchableOpacity>
      </View>

      <TonightSwapSheet
        visible={swapVisible}
        alternatives={proposal!.alternatives ?? []}
        onSwap={onSwap}
        onDismiss={() => setSwapVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0E0B08',
  },
  hero: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: '100%',
    height: height,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  copyBlock: {
    marginBottom: Spacing.lg,
  },
  copyLine: {
    fontSize: 16,
    color: '#FAF7F4',
    opacity: 0.92,
    marginBottom: Spacing.sm,
  },
  recipeTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  ctaRow: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cta: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1B16',
  },
  more: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  moreText: {
    color: '#FAF7F4',
    fontSize: 14,
    opacity: 0.85,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  errorCopy: {
    fontSize: 17,
    color: '#1F1B16',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retry: {
    backgroundColor: '#1F1B16',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  retryText: {
    color: '#FAF7F4',
    fontWeight: '700',
  },
});
