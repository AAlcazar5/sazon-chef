// frontend/components/recipe/HitMyMacrosSheet.tsx
// 10K: "Hit My Macros" sheet — user enters remaining calorie/protein budget,
// app calculates exact portion size to fit.

import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Modal } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

interface HitMyMacrosSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (target: { targetCalories?: number; targetProtein?: number }) => void;
  perServingCalories: number;
  perServingProtein: number;
  baseServings: number;
  isDark: boolean;
}

export default function HitMyMacrosSheet({
  visible,
  onClose,
  onApply,
  perServingCalories,
  perServingProtein,
  baseServings,
  isDark,
}: HitMyMacrosSheetProps) {
  const [calorieInput, setCalorieInput] = useState('');
  const [proteinInput, setProteinInput] = useState('');

  const targetCalories = calorieInput ? parseFloat(calorieInput) : undefined;
  const targetProtein = proteinInput ? parseFloat(proteinInput) : undefined;

  const preview = useMemo(() => {
    let scaleFactor: number | null = null;

    if (targetCalories && perServingCalories > 0) {
      scaleFactor = targetCalories / perServingCalories;
    } else if (targetProtein && perServingProtein > 0) {
      scaleFactor = targetProtein / perServingProtein;
    }

    if (scaleFactor == null) return null;

    const servings = baseServings * scaleFactor;
    const cal = Math.round(perServingCalories * scaleFactor);
    const pro = Math.round(perServingProtein * scaleFactor);

    return { servings, cal, pro, scaleFactor };
  }, [targetCalories, targetProtein, perServingCalories, perServingProtein, baseServings]);

  const hasTarget = targetCalories != null || targetProtein != null;

  const handleApply = () => {
    if (!hasTarget) return;
    onApply({
      targetCalories: targetCalories || undefined,
      targetProtein: targetProtein || undefined,
    });
    setCalorieInput('');
    setProteinInput('');
  };

  const handleCancel = () => {
    setCalorieInput('');
    setProteinInput('');
    onClose();
  };

  const bgColor = isDark ? '#1F2937' : '#FFFFFF';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 24,
      }}>
        <View style={{
          width: '100%',
          maxWidth: 360,
          borderRadius: 24,
          backgroundColor: bgColor,
          padding: 24,
          ...Shadows.MD,
        }}>
          <Text style={{
            fontSize: 20,
            fontFamily: 'PlusJakartaSans_800ExtraBold',
            color: textPrimary,
            marginBottom: 4,
          }}>
            Hit My Macros
          </Text>
          <Text style={{
            fontSize: 14,
            color: textSecondary,
            marginBottom: 20,
          }}>
            Enter your remaining budget — we'll calculate the perfect portion.
          </Text>

          {/* Calorie input */}
          <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: textSecondary, marginBottom: 6 }}>
            Remaining Calories
          </Text>
          <TextInput
            value={calorieInput}
            onChangeText={setCalorieInput}
            placeholder="e.g. 450"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            keyboardType="numeric"
            accessibilityLabel="Target calories input"
            style={{
              backgroundColor: inputBg,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              fontFamily: 'PlusJakartaSans_600SemiBold',
              color: textPrimary,
              marginBottom: 16,
            }}
          />

          {/* Protein input */}
          <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: textSecondary, marginBottom: 6 }}>
            Remaining Protein (g)
          </Text>
          <TextInput
            value={proteinInput}
            onChangeText={setProteinInput}
            placeholder="e.g. 35"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            keyboardType="numeric"
            accessibilityLabel="Target protein input"
            style={{
              backgroundColor: inputBg,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              fontFamily: 'PlusJakartaSans_600SemiBold',
              color: textPrimary,
              marginBottom: 20,
            }}
          />

          {/* Preview */}
          {preview && (
            <View style={{
              backgroundColor: isDark ? PastelDark.sage : Pastel.sage,
              borderRadius: 16,
              padding: 14,
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 15,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: isDark ? Accent.sage : '#2E7D32',
                textAlign: 'center',
              }}>
                {preview.servings.toFixed(1)} servings = {preview.cal} cal, {preview.pro}g protein
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <HapticTouchableOpacity
              onPress={handleCancel}
              hapticStyle="light"
              pressedScale={0.97}
              accessibilityLabel="Cancel"
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 100,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: textSecondary }}>Cancel</Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              onPress={handleApply}
              hapticStyle="medium"
              pressedScale={0.97}
              accessibilityLabel="Apply"
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 100,
                backgroundColor: hasTarget
                  ? (isDark ? Accent.sage : '#16A34A')
                  : (isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB'),
                alignItems: 'center',
                opacity: hasTarget ? 1 : 0.5,
              }}
            >
              <Text style={{
                fontSize: 15,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: hasTarget ? '#FFFFFF' : textSecondary,
              }}>
                Apply
              </Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
