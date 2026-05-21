import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelsJewelDark, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface MacroWidgetData {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  accentCircleColor: string;
}

interface MacroValue {
  consumed: number;
  goal: number;
}

interface EditorialMacroWidgetsProps {
  calories: MacroValue;
  protein: MacroValue;
  carbs: MacroValue;
  fat: MacroValue;
  fiber: MacroValue;
}

const CARD_WIDTH = 110;
const CARD_GAP = 10;
const STEP = CARD_WIDTH + CARD_GAP;
const AUTOSCROLL_INTERVAL_MS = 2800;
const RESUME_DELAY_MS = 4000;
const LOOP_COPIES = 3; // render the list 3× so we can jump silently across boundaries

export function EditorialMacroWidgets({
  calories,
  protein,
  carbs,
  fat,
  fiber,
}: EditorialMacroWidgetsProps) {
  const { isDark } = useTheme();
  const widgets: MacroWidgetData[] = [
    {
      label: 'CALORIES',
      consumed: calories.consumed,
      goal: calories.goal,
      unit: '',
      icon: 'flame-outline',
      bg: isDark ? PastelsJewelDark.amber.bg : Pastel.peach,
      accentCircleColor: isDark ? PastelsJewelDark.amber.dot : 'rgba(255,183,77,0.35)',
    },
    {
      label: 'PROTEIN',
      consumed: protein.consumed,
      goal: protein.goal,
      unit: 'g',
      icon: 'fitness-outline',
      bg: isDark ? PastelsJewelDark.green.bg : Pastel.sage,
      accentCircleColor: isDark ? PastelsJewelDark.green.dot : 'rgba(129,199,132,0.35)',
    },
    {
      label: 'CARBS',
      consumed: carbs.consumed,
      goal: carbs.goal,
      unit: 'g',
      icon: 'leaf-outline',
      bg: isDark ? PastelsJewelDark.amber.bg : Pastel.golden,
      accentCircleColor: isDark ? PastelsJewelDark.amber.dot : 'rgba(255,213,79,0.35)',
    },
    {
      label: 'FAT',
      consumed: fat.consumed,
      goal: fat.goal,
      unit: 'g',
      icon: 'water-outline',
      bg: isDark ? PastelsJewelDark.pink.bg : Pastel.blush,
      accentCircleColor: isDark ? PastelsJewelDark.pink.dot : 'rgba(244,143,177,0.35)',
    },
    {
      label: 'FIBER',
      consumed: fiber.consumed,
      goal: fiber.goal,
      unit: 'g',
      icon: 'nutrition-outline',
      bg: isDark ? PastelsJewelDark.lilac.bg : Pastel.lavender,
      accentCircleColor: isDark ? PastelsJewelDark.lilac.dot : 'rgba(206,147,216,0.35)',
    },
  ];

  const labelColor = isDark ? DarkColors.text.secondary : '#6B7280';
  const valueColor = isDark ? DarkColors.text.primary : '#111827';
  const goalColor = isDark ? DarkColors.text.secondary : '#6B7280';
  const iconCircleBg = isDark ? 'rgba(245,239,230,0.10)' : 'rgba(255,255,255,0.8)';
  const iconColor = isDark ? DarkColors.text.primary : '#111827';

  const N = widgets.length;
  const loopWidth = N * STEP;
  // Render the list LOOP_COPIES times; we live in the middle copy and jump
  // silently back/forward when crossing into the outer copies.
  const looped = Array.from({ length: LOOP_COPIES }, () => widgets).flat();

  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(loopWidth);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      if (!initializedRef.current) return;
      const target = offsetRef.current + STEP;
      scrollRef.current?.scrollTo({ x: target, animated: true });
    }, AUTOSCROLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = e.nativeEvent.contentOffset.x;
  };

  // After any momentum settles, recenter into the middle copy if we drifted
  // into an outer copy. animated:false makes the jump invisible.
  const recenterIfNeeded = () => {
    const x = offsetRef.current;
    if (x >= loopWidth * 2) {
      const adjusted = x - loopWidth;
      offsetRef.current = adjusted;
      scrollRef.current?.scrollTo({ x: adjusted, animated: false });
    } else if (x < loopWidth) {
      const adjusted = x + loopWidth;
      offsetRef.current = adjusted;
      scrollRef.current?.scrollTo({ x: adjusted, animated: false });
    }
  };

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const scheduleResume = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_DELAY_MS);
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      testID="macro-widgets"
      onScroll={handleScroll}
      scrollEventThrottle={32}
      onContentSizeChange={() => {
        // Initial scroll into the middle copy so we have buffer on both sides.
        if (!initializedRef.current) {
          scrollRef.current?.scrollTo({ x: loopWidth, animated: false });
          offsetRef.current = loopWidth;
          initializedRef.current = true;
        }
      }}
      onMomentumScrollEnd={() => {
        recenterIfNeeded();
        scheduleResume();
      }}
      onTouchStart={pause}
      onTouchEnd={scheduleResume}
      onScrollBeginDrag={pause}
      onScrollEndDrag={scheduleResume}
    >
      {looped.map((w, i) => (
        <View
          key={`${w.label}-${i}`}
          testID={i < N ? `widget-${i}` : undefined}
          style={[styles.card, { backgroundColor: w.bg }]}
        >
          <View style={[styles.accentCircle, { backgroundColor: w.accentCircleColor }]} />
          <View style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
            <Ionicons name={w.icon} size={16} color={iconColor} />
          </View>
          <Text style={[styles.label, { color: labelColor }]}>{w.label}</Text>
          <Text style={[styles.value, { color: valueColor }]}>
            {w.consumed}
            {w.unit}
          </Text>
          <Text style={[styles.goal, { color: goalColor }]}>
            of {w.goal}
            {w.unit}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: CARD_GAP,
    marginBottom: 28,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    padding: 14,
    overflow: 'hidden',
    minHeight: 110,
  },
  accentCircle: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    ...EditorialTypography.eyebrow,
    fontSize: 9,
    marginBottom: 4,
  },
  value: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  goal: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 11,
    marginTop: 2,
  },
});
