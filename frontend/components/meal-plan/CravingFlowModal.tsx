// frontend/components/meal-plan/CravingFlowModal.tsx
// 10G-C: "I want to eat [X] tonight" — the anti-guilt craving flow.
//
// Step 1: user types a craving (free text)
// Step 2: we hit /api/recipes/craving-flow and show:
//   - estimated macros for the real thing
//   - 3 option cards: "Go for it", "Make it healthier", "Similar but lighter"
//   - an honest one-liner about the trade-off
//
// The modal is presentation-only — it calls back to the parent with the chosen
// payload so the parent can slot the meal / save to cookbook / route to search.

import React, { useState, useCallback } from 'react';
import { View, Text, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { HapticPatterns } from '../../constants/Haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { searchApi } from '../../lib/api';

export interface CravingOriginal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CravingHealthified {
  title: string;
  description: string;
  cuisine: string;
  cookTime: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Array<{ text: string; order: number }>;
  instructions: Array<{ text: string; step: number }>;
}

export interface CravingLighterSuggestion {
  id: string;
  title: string;
  description?: string;
  cuisine?: string;
  cookTime?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface CravingFlowModalProps {
  visible: boolean;
  onClose: () => void;
  onGoForIt: (original: CravingOriginal) => void;
  onSaveHealthified: (healthified: CravingHealthified) => void;
  onBrowseLighter: (suggestions: CravingLighterSuggestion[]) => void;
}

type FlowState =
  | { phase: 'input' }
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | {
      phase: 'options';
      original: CravingOriginal;
      healthified: CravingHealthified;
      honestyNote: string;
      lighterSuggestions: CravingLighterSuggestion[];
    };

function CravingFlowModal({
  visible,
  onClose,
  onGoForIt,
  onSaveHealthified,
  onBrowseLighter,
}: CravingFlowModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [craving, setCraving] = useState('');
  const [state, setState] = useState<FlowState>({ phase: 'input' });

  const handleClose = useCallback(() => {
    setCraving('');
    setState({ phase: 'input' });
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmed = craving.trim();
    if (!trimmed) return;

    HapticPatterns.buttonPress();
    setState({ phase: 'loading' });

    try {
      const res = await searchApi.cravingFlow(trimmed);
      const data = (res as any).data;
      setState({
        phase: 'options',
        original: data.original,
        healthified: data.healthified,
        honestyNote: data.honestyNote,
        lighterSuggestions: data.lighterSuggestions || [],
      });
    } catch (err) {
      setState({
        phase: 'error',
        message: "Couldn't reach the kitchen — try again in a sec.",
      });
    }
  }, [craving]);

  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const surfaceBg = isDark ? DarkColors.background : Colors.background;
  const cardBg = isDark ? DarkColors.card : Colors.card;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: surfaceBg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 16,
            paddingHorizontal: 20,
            paddingBottom: 32,
            maxHeight: '90%',
          }}
        >
          {/* Drag handle */}
          <View style={{ alignSelf: 'center', width: 40, height: 4, backgroundColor: isDark ? '#444' : '#E5E5E5', borderRadius: 100, marginBottom: 12 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: FontSize.xl, fontFamily: 'PlusJakartaSans_800ExtraBold', color: textPrimary }}>
              I have a craving
            </Text>
            <HapticTouchableOpacity onPress={handleClose} accessibilityLabel="Close craving flow">
              <Icon name={Icons.CLOSE} size={IconSizes.MD} color={textSecondary} />
            </HapticTouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {state.phase === 'input' && (
              <>
                <Text style={{ fontSize: FontSize.sm, color: textSecondary, marginBottom: 10 }}>
                  What are you craving? Pizza, burger, pasta, ramen — anything goes. No judgement.
                </Text>
                <TextInput
                  testID="craving-flow-input"
                  value={craving}
                  onChangeText={setCraving}
                  placeholder="e.g. pizza"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: BorderRadius.card,
                    padding: 14,
                    fontSize: FontSize.md,
                    color: textPrimary,
                    marginBottom: 16,
                  }}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <HapticTouchableOpacity
                  testID="craving-flow-submit"
                  onPress={handleSubmit}
                  accessibilityLabel="Show craving options"
                  style={{
                    backgroundColor: Accent.peach,
                    borderRadius: 100,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: FontSize.md }}>
                    Show me the options
                  </Text>
                </HapticTouchableOpacity>
              </>
            )}

            {state.phase === 'loading' && (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Accent.peach} />
                <Text style={{ marginTop: 12, color: textSecondary }}>Thinking about your craving…</Text>
              </View>
            )}

            {state.phase === 'error' && (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ color: textPrimary, fontSize: FontSize.md, textAlign: 'center' }}>
                  {state.message}
                </Text>
                <HapticTouchableOpacity
                  onPress={() => setState({ phase: 'input' })}
                  style={{
                    marginTop: 16,
                    backgroundColor: Accent.peach,
                    borderRadius: 100,
                    paddingVertical: 12,
                    paddingHorizontal: 28,
                  }}
                >
                  <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' }}>Try again</Text>
                </HapticTouchableOpacity>
              </View>
            )}

            {state.phase === 'options' && (
              <View>
                {/* Estimated macros strip */}
                <View
                  style={{
                    backgroundColor: isDark ? PastelDark.blush : Pastel.blush,
                    borderRadius: BorderRadius.card,
                    padding: 14,
                    marginBottom: 16,
                  }}
                  testID="craving-flow-original"
                >
                  <Text style={{ fontSize: FontSize.xs, color: textSecondary, marginBottom: 4 }}>
                    A typical {state.original.name.toLowerCase()} is about
                  </Text>
                  <Text style={{ fontSize: FontSize.lg, fontFamily: 'PlusJakartaSans_800ExtraBold', color: textPrimary }}>
                    {state.original.calories} cal · {state.original.protein}g protein
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: textSecondary, marginTop: 4 }}>
                    {state.original.carbs}g carbs · {state.original.fat}g fat
                  </Text>
                </View>

                {/* 3 option cards */}
                <OptionCard
                  testID="craving-flow-option-go-for-it"
                  tint={isDark ? PastelDark.peach : Pastel.peach}
                  emoji="🍕"
                  title="Go for it"
                  subtitle={`Slot it into today. We'll adjust the rest of your meals to stay on budget.`}
                  onPress={() => onGoForIt(state.original)}
                  isDark={isDark}
                />
                <OptionCard
                  testID="craving-flow-option-healthier"
                  tint={isDark ? PastelDark.sage : Pastel.sage}
                  emoji="🥦"
                  title="Make it healthier"
                  subtitle={`${state.healthified.title} — ${state.healthified.calories} cal · ${state.healthified.protein}g protein`}
                  onPress={() => onSaveHealthified(state.healthified)}
                  isDark={isDark}
                />
                <OptionCard
                  testID="craving-flow-option-lighter"
                  tint={isDark ? PastelDark.sky : Pastel.sky}
                  emoji="🔀"
                  title="Something similar but lighter"
                  subtitle={
                    state.lighterSuggestions.length > 0
                      ? `${state.lighterSuggestions.length} recipes that scratch the same itch`
                      : 'Browse lighter alternatives'
                  }
                  onPress={() => onBrowseLighter(state.lighterSuggestions)}
                  isDark={isDark}
                />

                {/* Honesty note */}
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: BorderRadius.card,
                    padding: 14,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: FontSize.xs, color: textSecondary, fontStyle: 'italic' }}>
                    {state.honestyNote}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface OptionCardProps {
  testID: string;
  tint: string;
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isDark: boolean;
}

function OptionCard({ testID, tint, emoji, title, subtitle, onPress, isDark }: OptionCardProps) {
  return (
    <HapticTouchableOpacity
      testID={testID}
      onPress={onPress}
      accessibilityLabel={title}
      style={[
        {
          backgroundColor: tint,
          borderRadius: BorderRadius.card,
          padding: 16,
          marginBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        Shadows.SM,
      ]}
    >
      <Text style={{ fontSize: 28 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: FontSize.md,
          fontFamily: 'PlusJakartaSans_800ExtraBold',
          color: isDark ? DarkColors.text.primary : Colors.text.primary,
          marginBottom: 2,
        }}>
          {title}
        </Text>
        <Text style={{
          fontSize: FontSize.xs,
          color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
        }}>
          {subtitle}
        </Text>
      </View>
      <Icon
        name={Icons.CHEVRON_FORWARD}
        size={IconSizes.SM}
        color={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
      />
    </HapticTouchableOpacity>
  );
}

export default CravingFlowModal;
