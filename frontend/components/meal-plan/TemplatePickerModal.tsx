// frontend/components/meal-plan/TemplatePickerModal.tsx
// Modal for browsing and applying meal plan templates

import React from 'react';
import { View, Text, Modal, ScrollView, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import PulsingLoader from '../ui/PulsingLoader';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import type { MealPlanTemplate } from '../../types';

interface TemplatePickerModalProps {
  visible: boolean;
  templates: MealPlanTemplate[];
  loading: boolean;
  applying: boolean;
  isDark: boolean;
  onClose: () => void;
  onApply: (templateId: string) => void;
  onDelete: (templateId: string) => void;
}

const GOAL_LABELS: Record<string, { label: string; emoji: string }> = {
  weight_loss: { label: 'Weight Loss', emoji: '🔥' },
  muscle_gain: { label: 'Muscle Gain', emoji: '💪' },
  balanced: { label: 'Balanced', emoji: '⚖️' },
  budget: { label: 'Budget', emoji: '💰' },
};

function getTemplateStats(template: MealPlanTemplate) {
  const totalMeals = template.meals.length;
  const totalCalories = template.meals.reduce((sum, m) => {
    const cal = m.recipe?.calories ?? m.customCalories ?? 0;
    return sum + cal;
  }, 0);
  const days = new Set(template.meals.map(m => m.dayIndex)).size;
  const avgDailyCalories = days > 0 ? Math.round(totalCalories / days) : 0;

  return { totalMeals, avgDailyCalories, days };
}

export default function TemplatePickerModal({
  visible,
  templates,
  loading,
  applying,
  isDark,
  onClose,
  onApply,
  onDelete,
}: TemplatePickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black bg-opacity-50 justify-end">
        <View
          className="bg-white dark:bg-gray-800 rounded-t-2xl"
          style={{ maxHeight: '80%' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Meal Plan Templates
            </Text>
            <HapticTouchableOpacity onPress={onClose}>
              <Icon
                name={Icons.CLOSE}
                size={24}
                color={isDark ? '#9CA3AF' : '#6B7280'}
                accessibilityLabel="Close"
              />
            </HapticTouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color={isDark ? '#10B981' : '#059669'} />
              <Text className="text-gray-500 dark:text-gray-400 mt-3 text-sm">
                Loading templates...
              </Text>
            </View>
          ) : templates.length === 0 ? (
            <View className="py-16 items-center px-8">
              <Text className="text-4xl mb-3">📋</Text>
              <Text className="text-gray-900 dark:text-gray-100 font-semibold text-base mb-1">
                No Templates Yet
              </Text>
              <Text className="text-gray-500 dark:text-gray-400 text-sm text-center">
                Save your current week as a template to reuse it later!
              </Text>
            </View>
          ) : (
            <ScrollView
              className="px-4 py-3"
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {applying && (
                <View className="flex-row items-center justify-center py-3 mb-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                  <PulsingLoader size={14} color={isDark ? '#34D399' : '#059669'} />
                  <Text className="text-emerald-700 dark:text-emerald-300 font-medium ml-2 text-sm">
                    Applying template...
                  </Text>
                </View>
              )}

              {templates.map((template) => {
                const stats = getTemplateStats(template);
                const goalInfo = template.goal ? GOAL_LABELS[template.goal] : null;

                return (
                  <View
                    key={template.id}
                    className="mb-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                    style={{
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    }}
                  >
                    {/* Header row */}
                    <View className="flex-row items-start justify-between mb-1">
                      <View className="flex-1 mr-3">
                        <View className="flex-row items-center flex-wrap" style={{ gap: 6 }}>
                          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {template.name}
                          </Text>
                          {template.isSystem && (
                            <View
                              className="px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }}
                            >
                              <Text
                                className="text-xs font-medium"
                                style={{ color: isDark ? '#93C5FD' : '#2563EB' }}
                              >
                                Built-in
                              </Text>
                            </View>
                          )}
                          {goalInfo && (
                            <View
                              className="px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: isDark ? '#1C2D1C' : '#F0FDF4' }}
                            >
                              <Text className="text-xs font-medium" style={{ color: isDark ? '#86EFAC' : '#16A34A' }}>
                                {goalInfo.emoji} {goalInfo.label}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Delete button (user templates only) */}
                      {!template.isSystem && (
                        <HapticTouchableOpacity
                          onPress={() => onDelete(template.id)}
                          className="p-1"
                        >
                          <Icon
                            name={Icons.DELETE_OUTLINE}
                            size={18}
                            color={isDark ? '#EF4444' : '#DC2626'}
                            accessibilityLabel="Delete template"
                          />
                        </HapticTouchableOpacity>
                      )}
                    </View>

                    {/* Description */}
                    {template.description && (
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2" numberOfLines={2}>
                        {template.description}
                      </Text>
                    )}

                    {/* Stats row */}
                    <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {stats.totalMeals} meals
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {stats.days} days
                      </Text>
                      {stats.avgDailyCalories > 0 && (
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          ~{stats.avgDailyCalories} cal/day
                        </Text>
                      )}
                    </View>

                    {/* Apply button */}
                    <HapticTouchableOpacity
                      onPress={() => onApply(template.id)}
                      disabled={applying}
                      className={`py-2.5 px-4 rounded-lg items-center ${applying ? 'opacity-50' : ''}`}
                      style={{
                        backgroundColor: isDark ? '#065F46' : '#059669',
                      }}
                    >
                      <Text className="text-white font-semibold text-sm">
                        Apply to This Week
                      </Text>
                    </HapticTouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
