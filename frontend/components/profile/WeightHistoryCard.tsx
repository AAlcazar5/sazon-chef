// frontend/components/profile/WeightHistoryCard.tsx
// Weight history card with trend chart and recent logs

import { View, Text, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { router } from 'expo-router';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import WeightTrendChart from './WeightTrendChart';

interface WeightHistoryCardProps {
  physicalProfile: any | null;
  weightHistory: any[];
  weightHistoryLoading: boolean;
}

export default function WeightHistoryCard({ physicalProfile, weightHistory, weightHistoryLoading }: WeightHistoryCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showChart, setShowChart] = useState(true);
  const [showRecentLogs, setShowRecentLogs] = useState(false);

  if (!physicalProfile) return null;

  const currentWeightKg = physicalProfile.weightKg;
  const targetWeightKg = physicalProfile.targetWeightKg;

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryDark }}>
            <Icon name={"scale-outline" as any} size={IconSizes.MD} color={isDark ? DarkColors.primary : '#FFFFFF'} accessibilityLabel="Weight history" />
          </View>
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weight Trend</Text>
            {currentWeightKg && (
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Current: {(currentWeightKg * 2.20462).toFixed(1)} lbs
                {targetWeightKg && ` · Goal: ${(targetWeightKg * 2.20462).toFixed(1)} lbs`}
              </Text>
            )}
          </View>
        </View>
        <HapticTouchableOpacity
          onPress={() => router.push('/weight-input')}
          className="flex-row items-center px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A` }}
        >
          <Icon name={Icons.ADD} size={IconSizes.XS} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Log weight" />
          <Text className="text-xs font-medium ml-1" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
            Log
          </Text>
        </HapticTouchableOpacity>
      </View>

      {weightHistoryLoading ? (
        <View className="py-8">
          <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
          <Text className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
            Loading weight data...
          </Text>
        </View>
      ) : (
        <>
          {/* Chart Section */}
          <HapticTouchableOpacity
            onPress={() => setShowChart(!showChart)}
            className="flex-row items-center justify-between py-2 mb-2"
          >
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Trend Chart
            </Text>
            <Icon
              name={showChart ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN}
              size={IconSizes.SM}
              color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
              accessibilityLabel={showChart ? 'Hide chart' : 'Show chart'}
            />
          </HapticTouchableOpacity>

          {showChart && (
            <WeightTrendChart
              weightHistory={weightHistory}
              targetWeightKg={targetWeightKg}
              currentWeightKg={currentWeightKg}
            />
          )}

          {/* Recent Logs Section */}
          {weightHistory.length > 0 && (
            <>
              <HapticTouchableOpacity
                onPress={() => setShowRecentLogs(!showRecentLogs)}
                className="flex-row items-center justify-between py-2 mt-2 border-t border-gray-200 dark:border-gray-700"
              >
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recent Logs ({weightHistory.length})
                </Text>
                <Icon
                  name={showRecentLogs ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN}
                  size={IconSizes.SM}
                  color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
                  accessibilityLabel={showRecentLogs ? 'Hide logs' : 'Show logs'}
                />
              </HapticTouchableOpacity>

              {showRecentLogs && (
                <View className="mt-2">
                  {weightHistory.slice(0, 10).map((log: any, index: number) => {
                    const date = new Date(log.date);
                    const weightLbs = Math.round(log.weightKg * 2.20462 * 10) / 10;

                    // Calculate change from previous log
                    const prevLog = weightHistory[index + 1];
                    let changeText = '';
                    let changeColor = isDark ? DarkColors.text.secondary : Colors.text.secondary;
                    if (prevLog) {
                      const change = (log.weightKg - prevLog.weightKg) * 2.20462;
                      if (change !== 0) {
                        changeText = `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
                        changeColor = change < 0
                          ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                          : Colors.secondaryRed;
                      }
                    }

                    return (
                      <View
                        key={log.id}
                        className={`flex-row justify-between items-center py-2.5 ${
                          index < Math.min(9, weightHistory.length - 1)
                            ? 'border-b border-gray-100 dark:border-gray-700'
                            : ''
                        }`}
                      >
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Text>
                          {log.notes && (
                            <Text
                              className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                              numberOfLines={1}
                            >
                              {log.notes}
                            </Text>
                          )}
                        </View>
                        <View className="flex-row items-center">
                          {changeText && (
                            <Text
                              className="text-xs font-medium mr-2"
                              style={{ color: changeColor }}
                            >
                              {changeText}
                            </Text>
                          )}
                          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {weightLbs} lbs
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {weightHistory.length > 10 && (
                    <View className="mt-2 pt-2">
                      <Text className="text-center text-xs text-gray-500 dark:text-gray-400">
                        Showing 10 of {weightHistory.length} logs
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* Empty state */}
          {weightHistory.length === 0 && !showChart && (
            <View className="py-4">
              <Text className="text-gray-500 dark:text-gray-400 text-sm text-center">
                No weight logs yet. Tap "Log" to record your first weight!
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
