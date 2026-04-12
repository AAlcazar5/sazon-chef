// frontend/components/recipe/AskSazonSheet.tsx
// Chat-style bottom sheet for conversational ingredient substitution.
// User asks "I don't have coconut milk" or "Make this dairy-free" and
// Sazon responds with a structured diff that can be applied to the recipe.

import React, { useState, useRef } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import BottomSheet from '../ui/BottomSheet';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubstitutionDiff {
  ingredientChanges: Array<{
    original: string;
    replacement: string;
    reason: string;
  }>;
  instructionChanges: Array<{
    step: number;
    original: string;
    updated: string;
    reason: string;
  }>;
  macroImpact: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  summary: string;
}

interface Props {
  visible: boolean;
  recipeId: string;
  isDark: boolean;
  /** Pre-fill the question (e.g. "I don't have chicken breast") */
  initialQuestion?: string;
  onClose: () => void;
  /** Called when user accepts the suggested changes */
  onApplyChanges: (diff: SubstitutionDiff) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MacroImpactRow({ label, value, isDark }: { label: string; value: number; isDark: boolean }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  const color = isPositive ? '#F97316' : '#22C55E';
  const sign = isPositive ? '+' : '';
  const unit = label === 'cal' ? '' : 'g';

  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 100,
      backgroundColor: isPositive ? 'rgba(249,115,22,0.12)' : 'rgba(34,197,94,0.12)',
      marginRight: 4,
      marginBottom: 4,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>
        {sign}{value}{unit} {label}
      </Text>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AskSazonSheet({
  visible,
  recipeId,
  isDark,
  initialQuestion,
  onClose,
  onApplyChanges,
}: Props) {
  const [question, setQuestion] = useState(initialQuestion ?? '');
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<SubstitutionDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Reset state when sheet opens with a new question
  React.useEffect(() => {
    if (visible) {
      setQuestion(initialQuestion ?? '');
      setDiff(null);
      setError(null);
      // Auto-submit if pre-filled from "I don't have this"
      if (initialQuestion) {
        handleAsk(initialQuestion);
      }
    }
  }, [visible, initialQuestion]);

  const handleAsk = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setDiff(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await recipeApi.askSubstitution(recipeId, text);
      const result = (response as any)?.data?.diff;
      if (!result) throw new Error('No substitution response');
      setDiff(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const isQuota = err?.code === 'insufficient_quota' || err?.message?.includes('quota');
      setError(
        isQuota
          ? 'Sazon is a bit overwhelmed right now — try again in a few minutes!'
          : 'Hmm, couldn\'t figure that one out. Try rephrasing?'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!diff) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApplyChanges(diff);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Ask Sazon"
      snapPoints={['70%', '90%']}
      scrollable
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          {/* Input area */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F3F0',
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 16,
          }}>
            <TextInput
              ref={inputRef}
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. &quot;I don't have coconut milk&quot; or &quot;Make this dairy-free&quot;"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              multiline
              maxLength={200}
              style={{
                flex: 1,
                fontSize: 15,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
                maxHeight: 80,
                paddingTop: 0,
                paddingBottom: 0,
              }}
              editable={!loading}
              accessibilityLabel="Ask Sazon about substitutions"
            />
            <HapticTouchableOpacity
              onPress={() => handleAsk()}
              hapticStyle="medium"
              pressedScale={0.9}
              disabled={loading || question.trim().length === 0}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: loading || question.trim().length === 0
                  ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
                  : (isDark ? '#FFB74D' : '#EA580C'),
                marginLeft: 8,
              }}
              accessibilityLabel="Send question"
            >
              <Text style={{
                fontSize: 16,
                color: loading || question.trim().length === 0
                  ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')
                  : '#FFFFFF',
              }}>
                {loading ? '...' : '↑'}
              </Text>
            </HapticTouchableOpacity>
          </View>

          {/* Loading state */}
          {loading && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 300 }}
            >
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 28, marginBottom: 12 }}>🧑‍🍳</Text>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDark ? DarkColors.text.primary : Colors.text.primary,
                  marginBottom: 4,
                }}>
                  Sazon is thinking...
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
                  textAlign: 'center',
                }}>
                  Finding the best swap for your recipe
                </Text>
              </View>
            </MotiView>
          )}

          {/* Error state */}
          {error && (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            >
              <View style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)',
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>😅</Text>
                <Text style={{
                  fontSize: 14,
                  color: isDark ? '#FCA5A5' : '#DC2626',
                  textAlign: 'center',
                  lineHeight: 20,
                }}>
                  {error}
                </Text>
              </View>
            </MotiView>
          )}

          {/* Results */}
          {diff && !loading && (
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            >
              {/* Summary */}
              <View style={{
                backgroundColor: isDark ? 'rgba(255,183,77,0.08)' : 'rgba(251,146,60,0.06)',
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
              }}>
                <Text style={{ fontSize: 18, marginBottom: 6 }}>🧑‍🍳</Text>
                <Text style={{
                  fontSize: 14,
                  color: isDark ? DarkColors.text.primary : Colors.text.primary,
                  lineHeight: 20,
                }}>
                  {diff.summary}
                </Text>
              </View>

              {/* Ingredient changes */}
              {diff.ingredientChanges.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: isDark ? DarkColors.text.primary : Colors.text.primary,
                    marginBottom: 8,
                  }}>
                    Ingredient Swaps
                  </Text>
                  {diff.ingredientChanges.map((change, idx) => (
                    <View key={idx} style={{
                      backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{
                          fontSize: 13,
                          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                          textDecorationLine: 'line-through',
                          flex: 1,
                        }} numberOfLines={1}>
                          {change.original}
                        </Text>
                        <Text style={{ fontSize: 12, marginHorizontal: 6 }}>→</Text>
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: isDark ? '#86EFAC' : '#16A34A',
                          flex: 1,
                        }} numberOfLines={1}>
                          {change.replacement}
                        </Text>
                      </View>
                      {change.reason ? (
                        <Text style={{
                          fontSize: 12,
                          color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
                          fontStyle: 'italic',
                        }}>
                          {change.reason}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Instruction changes */}
              {diff.instructionChanges.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: isDark ? DarkColors.text.primary : Colors.text.primary,
                    marginBottom: 8,
                  }}>
                    Updated Steps
                  </Text>
                  {diff.instructionChanges.map((change, idx) => (
                    <View key={idx} style={{
                      backgroundColor: isDark ? 'rgba(96,165,250,0.08)' : 'rgba(59,130,246,0.05)',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: isDark ? '#93C5FD' : '#2563EB',
                        marginBottom: 4,
                      }}>
                        Step {change.step}
                      </Text>
                      <Text style={{
                        fontSize: 13,
                        color: isDark ? DarkColors.text.primary : Colors.text.primary,
                        lineHeight: 18,
                      }}>
                        {change.updated}
                      </Text>
                      {change.reason ? (
                        <Text style={{
                          fontSize: 11,
                          color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
                          fontStyle: 'italic',
                          marginTop: 4,
                        }}>
                          {change.reason}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Macro impact */}
              {(diff.macroImpact.calories !== 0 || diff.macroImpact.protein !== 0 ||
                diff.macroImpact.carbs !== 0 || diff.macroImpact.fat !== 0) && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
                    marginBottom: 6,
                  }}>
                    Macro Impact
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <MacroImpactRow label="cal" value={diff.macroImpact.calories} isDark={isDark} />
                    <MacroImpactRow label="protein" value={diff.macroImpact.protein} isDark={isDark} />
                    <MacroImpactRow label="carbs" value={diff.macroImpact.carbs} isDark={isDark} />
                    <MacroImpactRow label="fat" value={diff.macroImpact.fat} isDark={isDark} />
                    <MacroImpactRow label="fiber" value={diff.macroImpact.fiber} isDark={isDark} />
                  </View>
                </View>
              )}

              {/* Apply Changes CTA */}
              <BrandButton
                label="Apply Changes"
                variant="brand"
                onPress={handleApply}
              />

              {/* Disclaimer */}
              <Text style={{
                fontSize: 11,
                color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
                textAlign: 'center',
                marginTop: 10,
                lineHeight: 16,
              }}>
                Applying changes will create a personal copy of this recipe
              </Text>
            </MotiView>
          )}
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
