// frontend/components/recipe/MicronutrientSheet.tsx
// Bottom sheet showing key micronutrients for a recipe.
// Ranked by most commonly deficient in Western diets.

import { View, Text, Modal, Pressable, Animated, ScrollView } from 'react-native';
import { useRef, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import { MICRONUTRIENTS, type MicronutrientInfo } from '../../constants/MicronutrientAnnotations';

interface NutritionData {
  fiber?: number;
  omega3?: number;
  magnesium?: number;
  vitaminD?: number;
  potassium?: number;
  iron?: number;
  folate?: number;
  [key: string]: number | undefined;
}

interface MicronutrientSheetProps {
  visible: boolean;
  nutrition: NutritionData;
  onDismiss: () => void;
}

function getPctDV(amount: number | undefined, dailyValue: number): number {
  if (!amount || dailyValue <= 0) return 0;
  return Math.round((amount / dailyValue) * 100);
}

function getPctColor(pct: number, isDark: boolean): string {
  if (pct >= 20) return isDark ? '#34D399' : '#059669'; // great
  if (pct >= 10) return isDark ? '#FBBF24' : '#D97706'; // decent
  return isDark ? '#9CA3AF' : '#6B7280'; // low
}

export default function MicronutrientSheet({ visible, nutrition, onDismiss }: MicronutrientSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropAnim }}>
        <Pressable style={{ flex: 1 }} onPress={onDismiss} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY: slideAnim }],
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 34,
          maxHeight: '70%',
        }}
      >
        {/* Handle */}
        <View className="items-center pt-3 pb-1">
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? '#4B5563' : '#D1D5DB' }} />
        </View>

        <View className="px-5 pt-3 pb-2">
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Micronutrients
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Per serving · % of daily value
          </Text>
        </View>

        <ScrollView className="px-5" bounces={false}>
          {MICRONUTRIENTS.map((micro: MicronutrientInfo) => {
            const amount = nutrition[micro.key] ?? 0;
            const pct = getPctDV(amount, micro.dailyValue);
            const pctColor = getPctColor(pct, isDark);

            return (
              <View key={micro.key} className="py-3 border-b border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {micro.name}
                  </Text>
                  <View className="flex-row items-center">
                    <Text style={{ fontSize: 13, fontWeight: '700', color: pctColor, marginRight: 4 }}>
                      {pct}%
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-gray-500">
                      ({amount.toFixed(1)}{micro.unit})
                    </Text>
                  </View>
                </View>

                {/* Mini progress bar */}
                <View
                  style={{
                    width: '100%',
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDark ? '#374151' : '#E5E7EB',
                    marginTop: 6,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      height: '100%',
                      borderRadius: 2,
                      backgroundColor: pctColor,
                    }}
                  />
                </View>

                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-4">
                  {micro.annotation}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
