// frontend/components/meal-plan/RecurringMealsManagerModal.tsx
// Full-screen modal to view, edit, and delete recurring meal rules

import { View, Text, Switch, Alert } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import RecurringModalShell from './RecurringModalShell';
import type { RecurringMeal } from '../../types';
import { t } from '../../lib/i18n';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: '#F59E0B',
  lunch: '#10B981',
  dinner: '#6366F1',
  snack: '#EC4899',
};

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

interface RecurringMealsManagerModalProps {
  visible: boolean;
  onClose: () => void;
  rules: RecurringMeal[];
  onEdit: (rule: RecurringMeal) => void;
  onDelete: (ruleId: string) => void;
  onToggleActive: (ruleId: string, isActive: boolean) => void;
}

export default function RecurringMealsManagerModal({
  visible,
  onClose,
  rules,
  onEdit,
  onDelete,
  onToggleActive,
}: RecurringMealsManagerModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleDelete = (rule: RecurringMeal) => {
    const title = rule.recipe?.title || rule.title || 'this rule';
    Alert.alert(
      'Delete Recurring Meal',
      `Delete "${title}"? This won't remove meals already created from this rule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(rule.id) },
      ]
    );
  };

  const activeRules = rules.filter(r => r.isActive);
  const inactiveRules = rules.filter(r => !r.isActive);
  const subtitle =
    rules.length === 0
      ? 'No recurring meals set'
      : `${activeRules.length} active rule${activeRules.length !== 1 ? 's' : ''}`;

  return (
    <RecurringModalShell
      visible={visible}
      onClose={onClose}
      title={t('mealPlan.recurringManager.title')}
      subtitle={subtitle}
      maxHeight="80%"
    >
            {rules.length === 0 ? (
              <View className="items-center py-8">
                <Icon name={Icons.REFRESH} size={48} color={isDark ? '#4B5563' : '#D1D5DB'} accessibilityLabel="No recurring meals" />
                <Text className="text-base font-medium text-gray-500 dark:text-gray-400 mt-3">{t('mealPlan.recurringManager.empty')}</Text>
                <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1 text-center px-4">
                  Long-press a meal card and tap "Set as Recurring" to repeat it automatically.
                </Text>
              </View>
            ) : (
              <>
                {/* Active rules */}
                {activeRules.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    isDark={isDark}
                    onEdit={() => onEdit(rule)}
                    onDelete={() => handleDelete(rule)}
                    onToggleActive={(active) => onToggleActive(rule.id, active)}
                  />
                ))}

                {/* Inactive rules */}
                {inactiveRules.length > 0 && (
                  <>
                    <Text className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-4 mb-2 uppercase tracking-wider">
                      {t('mealPlan.recurringManager.paused')}
                    </Text>
                    {inactiveRules.map(rule => (
                      <RuleCard
                        key={rule.id}
                        rule={rule}
                        isDark={isDark}
                        onEdit={() => onEdit(rule)}
                        onDelete={() => handleDelete(rule)}
                        onToggleActive={(active) => onToggleActive(rule.id, active)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
    </RecurringModalShell>
  );
}

function RuleCard({
  rule,
  isDark,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  rule: RecurringMeal;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const title = rule.recipe?.title || rule.title || 'Custom Meal';
  const mealTypeColor = MEAL_TYPE_COLORS[rule.mealType] || '#6B7280';
  const mealTypeEmoji = MEAL_TYPE_EMOJI[rule.mealType] || '🍽️';
  const days = new Set(rule.daysOfWeek.split(',').map(d => parseInt(d.trim(), 10)));

  return (
    <View
      className="rounded-lg border mb-3 overflow-hidden"
      style={{
        borderColor: isDark ? '#374151' : '#E5E7EB',
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA',
        opacity: rule.isActive ? 1 : 0.6,
      }}
    >
      <View className="p-3">
        {/* Title row */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <Text style={{ fontSize: 16, marginRight: 6 }}>{mealTypeEmoji}</Text>
            <Text
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1"
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
          <Switch
            value={rule.isActive}
            onValueChange={onToggleActive}
            trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
            thumbColor="#FFFFFF"
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>

        {/* Meal type badge + day chips */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${mealTypeColor}22` }}
            >
              <Text className="text-xs font-medium capitalize" style={{ color: mealTypeColor }}>
                {rule.mealType}
              </Text>
            </View>
            {/* Day indicators */}
            <View className="flex-row" style={{ gap: 2, marginLeft: 4 }}>
              {DAY_LABELS.map((label, index) => (
                <View
                  key={index}
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: days.has(index)
                      ? isDark ? `${DarkColors.primary}44` : `${Colors.primary}22`
                      : 'transparent',
                  }}
                >
                  <Text
                    className="text-xs"
                    style={{
                      color: days.has(index)
                        ? isDark ? DarkColors.primary : Colors.primary
                        : isDark ? '#6B7280' : '#9CA3AF',
                      fontWeight: days.has(index) ? '600' : '400',
                    }}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Action row */}
        <View className="flex-row justify-end mt-2" style={{ gap: 8 }}>
          <HapticTouchableOpacity onPress={onEdit} className="flex-row items-center">
            <Icon name={Icons.EDIT_OUTLINE} size={14} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Edit" />
            <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">{t('common.edit')}</Text>
          </HapticTouchableOpacity>
          <HapticTouchableOpacity onPress={onDelete} className="flex-row items-center">
            <Icon name={Icons.DELETE_OUTLINE} size={14} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} accessibilityLabel="Delete" />
            <Text className="text-xs ml-1" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>{t('common.delete')}</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </View>
  );
}
