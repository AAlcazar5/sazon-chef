// frontend/app/plate/[slug].tsx
// Group 10X Phase 8 — Deep link routing for shared plates.
//
// Hit by `sazon.app/plate/<slug>` (universal link) or in-app navigation.
// Fetches the shared plate composition, then hands off to /build-a-plate
// which pre-fills slots and shows the substitution banner. Sazon mascots
// own both the loading and 404 states — no spinners, no error banners.

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import ScreenGradient from '../../components/ui/ScreenGradient';
import BrandButton from '../../components/ui/BrandButton';
import Sazon from '../../components/mascot/Sazon';
import { sharedPlatesApi } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

type LoadState = 'loading' | 'notFound';

export default function SharedPlateDeepLinkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const slug = typeof params.slug === 'string' ? params.slug.trim() : '';
  const [state, setState] = useState<LoadState>(slug ? 'loading' : 'notFound');

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setState('loading');

    const run = async () => {
      try {
        const res = await sharedPlatesApi.fetchBySlug(slug);
        if (cancelled) return;
        const plateId = res?.data?.share?.plate?.id;
        if (!plateId) {
          setState('notFound');
          return;
        }
        // Hand off to the composer with the shared plate pre-loaded.
        router.replace(
          `/build-a-plate?plateId=${encodeURIComponent(String(plateId))}&from=shared` as any,
        );
      } catch {
        if (cancelled) return;
        setState('notFound');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // router is stable per session; keep it out of deps to avoid re-running the
    // fetch on every re-render (each useRouter() call returns a new object).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const titleColor = isDark ? '#F5F0EB' : '#2C1810';
  const bodyColor = isDark ? '#D1D5DB' : '#5A4534';

  return (
    <ScreenGradient testID="plate-deeplink-screen">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          {state === 'loading' ? (
            <View style={styles.stack} testID="plate-deeplink-loading">
              <Sazon variant="orange" motion="wobble" fx={['question']} size={160} />
              <Text style={[styles.title, { color: titleColor }]} accessibilityRole="header">
                Pulling up that plate…
              </Text>
              <Text style={[styles.body, { color: bodyColor }]}>
                Hang tight — we're plating it up the way they made it.
              </Text>
            </View>
          ) : (
            <View style={styles.stack} testID="plate-deeplink-not-found">
              <Sazon variant="orange" motion="jiggle" fx={['question']} size={160} />
              <Text style={[styles.title, { color: titleColor }]} accessibilityRole="header">
                Hmm, we can't find that plate
              </Text>
              <Text style={[styles.body, { color: bodyColor }]}>
                The link might be stale — but you can still build something delicious.
              </Text>
              <View style={styles.ctaSpacer} />
              <BrandButton
                label="Build your own"
                variant="brand"
                icon="restaurant-outline"
                onPress={() => router.replace('/build-a-plate')}
                testID="build-own-plate-cta"
                accessibilityLabel="Build your own plate"
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stack: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_700Bold',
    textAlign: 'center',
    marginTop: 12,
  },
  body: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  ctaSpacer: {
    height: 16,
  },
});
