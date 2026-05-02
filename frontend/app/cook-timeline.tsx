// frontend/app/cook-timeline.tsx
// Group 10X Phase 3 — Gantt cook timeline screen.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ScreenGradient from '../components/ui/ScreenGradient';
import BrandButton from '../components/ui/BrandButton';
import { StickyBottomBar } from '../components/ui/StickyBottomBar';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GanttTimeline from '../components/cook-timeline/GanttTimeline';
import LoadingState from '../components/ui/LoadingState';
import useCookTimelineTicker from '../hooks/useCookTimelineTicker';
import { composedPlateApi, type ParallelTimeline, type TimelineEvent } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { Shadows, BorderRadius } from '../constants';
import { Ionicons } from '@expo/vector-icons';

interface ToastState {
  visible: boolean;
  message: string;
}

export default function CookTimelineScreen() {
  const router = useRouter();
  const { plateId } = useLocalSearchParams<{ plateId: string }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [timeline, setTimeline] = useState<ParallelTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { activeMinute, start: startTicker, slip: slipTicker } = useCookTimelineTicker();

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message });
    toastTimer.current = setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  }, []);

  useEffect(() => {
    if (!plateId) {
      setError(true);
      setLoading(false);
      return;
    }

    composedPlateApi
      .timeline(plateId)
      .then((res) => {
        setTimeline(res.data?.timeline ?? null);
        setLoading(false);
        startTicker();
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [plateId, startTicker]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleActiveBoundary = useCallback(
    (event: TimelineEvent) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      const verb = event.action === 'plate' ? 'Plate everything' : `Start ${event.name} now`;
      showToast(verb);
    },
    [showToast],
  );

  const handleSlip = useCallback(() => {
    slipTicker(5);
    showToast('Shifted +5 min');
  }, [slipTicker, showToast]);

  const handleDone = useCallback(() => {
    Alert.alert('All done?', 'Mark this cook session complete?', [
      { text: 'Keep cooking', style: 'cancel' },
      { text: 'Done!', onPress: () => router.back() },
    ]);
  }, [router]);

  const bg = isDark ? '#0F0F10' : '#FAF7F4';

  if (loading) {
    return (
      <ScreenGradient style={{ flex: 1, backgroundColor: bg }} testID="cook-timeline-screen">
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <LoadingState
            message="Building your cook timeline…"
            expression="thinking"
            size="large"
            animationType="pulse"
            fullScreen
          />
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (error || !timeline) {
    return (
      <ScreenGradient style={{ flex: 1, backgroundColor: bg }} testID="cook-timeline-screen">
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.centered} testID="cook-timeline-empty">
            <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
              Couldn't load this plate's timeline yet — try again.
            </Text>
            <BrandButton
              label="Go back"
              variant="ghost"
              onPress={() => router.back()}
              testID="empty-back-btn"
            />
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient style={{ flex: 1, backgroundColor: bg }} testID="cook-timeline-screen">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <HapticTouchableOpacity
            onPress={() => router.back()}
            hapticStyle="light"
            style={styles.headerBtn}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={isDark ? '#FFF' : '#1F2937'} />
          </HapticTouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.eyebrow, { color: isDark ? '#FFD4A6' : '#8a4a00' }]}>COOK THIS</Text>
            <Text style={[styles.title, { color: isDark ? '#FFF' : '#1F2937' }]}>
              Plate · {timeline.totalMinutes} min
            </Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.ganttWrapper}>
          <GanttTimeline
            timeline={timeline}
            activeMinute={activeMinute}
            onActiveBoundary={handleActiveBoundary}
            testID="gantt-timeline"
          />
        </View>

        {toast.visible && (
          <View style={[styles.toast, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', ...Shadows.MD }]}>
            <Text style={[styles.toastText, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
              {toast.message}
            </Text>
          </View>
        )}
      </SafeAreaView>

      <StickyBottomBar fadeColor={bg}>
        <View style={styles.actionRow}>
          <BrandButton
            label="Slip 5 min"
            variant="golden"
            size="compact"
            onPress={handleSlip}
            testID="slip-btn"
            style={styles.slipBtn}
          />
          <BrandButton
            label="Done"
            variant="sage"
            size="compact"
            onPress={handleDone}
            testID="done-btn"
            style={styles.doneBtn}
          />
        </View>
      </StickyBottomBar>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  ganttWrapper: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
  },
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  slipBtn: {
    flex: 1,
  },
  doneBtn: {
    flex: 1,
  },
});
