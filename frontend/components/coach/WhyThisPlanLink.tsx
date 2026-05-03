// 10Y entry-points (3/3): Meal-plan "Why this plan?" link that seeds a Coach
// conversation with today's goal phase + meal titles, then routes to coach.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { coachApi } from '../../lib/api';
import { Pastel, PastelDark } from '../../constants/Colors';

interface WhyThisPlanLinkProps {
  mealTitles: string[];
  goalPhase?: string;
}

function buildSeed(mealTitles: string[], goalPhase: string | undefined): string {
  const titles = mealTitles.length > 0 ? mealTitles.join(', ') : 'no meals planned yet';
  const phase = goalPhase ?? 'maintain';
  return `Walk me through today's meal plan. Goal phase: ${phase}. Meals: ${titles}. Why these for me?`;
}

export default function WhyThisPlanLink({ mealTitles, goalPhase }: WhyThisPlanLinkProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [busy, setBusy] = useState(false);

  const bg = isDark ? PastelDark.lavender : Pastel.lavender;
  const fg = isDark ? '#F3E5F5' : '#4A148C';

  const handlePress = async () => {
    if (busy) return;
    setBusy(true);
    const seed = buildSeed(mealTitles, goalPhase);
    try {
      const convo = await coachApi.createConversation(seed);
      const url = `/(tabs)/coach?conversationId=${encodeURIComponent(convo.id)}&seedMessage=${encodeURIComponent(seed)}`;
      router.push(url as never);
    } catch {
      router.push('/(tabs)/coach' as never);
    } finally {
      setBusy(false);
    }
  };

  return (
    <HapticTouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Why this plan? — ask the Coach"
      onPress={handlePress}
      disabled={busy}
      style={[styles.link, { backgroundColor: bg }]}
    >
      <Ionicons name="chatbubble-outline" size={13} color={fg} />
      <Text style={[styles.label, { color: fg }]}>Why this plan?</Text>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  } as any,
  label: {
    fontFamily: Platform.select({
      ios: 'Fraunces_500Medium',
      default: 'Fraunces_500Medium',
    }),
    fontSize: 13,
  },
});
