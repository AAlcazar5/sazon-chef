// frontend/components/profile/WeightTrendChart.tsx
// Weight trend line chart with time period selection and statistics

import { View, Text, Dimensions } from 'react-native';
import { useState, useMemo } from 'react';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';

interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  notes?: string;
}

interface WeightTrendChartProps {
  weightHistory: WeightEntry[];
  targetWeightKg?: number;
  currentWeightKg?: number;
}

type TimePeriod = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const TIME_PERIODS: { key: TimePeriod; label: string; days: number | null }[] = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'ALL', label: 'All', days: null },
];

export default function WeightTrendChart({ weightHistory, targetWeightKg, currentWeightKg }: WeightTrendChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
  const [selectedPoint, setSelectedPoint] = useState<WeightEntry | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 48; // Account for padding
  const chartHeight = 180;
  const chartPadding = { top: 20, right: 10, bottom: 30, left: 45 };

  // Filter data based on selected time period
  const filteredData = useMemo(() => {
    if (!weightHistory || weightHistory.length === 0) return [];

    const sorted = [...weightHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const periodConfig = TIME_PERIODS.find(p => p.key === selectedPeriod);
    if (!periodConfig?.days) return sorted;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodConfig.days);

    return sorted.filter(entry => new Date(entry.date) >= cutoffDate);
  }, [weightHistory, selectedPeriod]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        startWeight: 0,
        endWeight: 0,
        totalChange: 0,
        weeklyRate: 0,
        progressToGoal: 0,
      };
    }

    const weights = filteredData.map(d => d.weightKg);
    const startWeight = weights[0];
    const endWeight = weights[weights.length - 1];
    const totalChange = endWeight - startWeight;

    // Calculate weekly rate
    const startDate = new Date(filteredData[0].date);
    const endDate = new Date(filteredData[filteredData.length - 1].date);
    const daysDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeklyRate = (totalChange / daysDiff) * 7;

    // Progress to goal
    let progressToGoal = 0;
    if (targetWeightKg && currentWeightKg) {
      const totalToLose = startWeight - targetWeightKg;
      const alreadyLost = startWeight - endWeight;
      if (totalToLose !== 0) {
        progressToGoal = Math.min(100, Math.max(0, (alreadyLost / totalToLose) * 100));
      }
    }

    return {
      average: weights.reduce((a, b) => a + b, 0) / weights.length,
      min: Math.min(...weights),
      max: Math.max(...weights),
      startWeight,
      endWeight,
      totalChange,
      weeklyRate,
      progressToGoal,
    };
  }, [filteredData, targetWeightKg, currentWeightKg]);

  // Generate chart path
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return { path: '', points: [], yLabels: [], xLabels: [], goalLineY: null, minWeight: 0, maxWeight: 0 };

    const weights = filteredData.map(d => d.weightKg);
    const minWeight = Math.min(...weights, targetWeightKg || Infinity) - 1;
    const maxWeight = Math.max(...weights) + 1;
    const weightRange = maxWeight - minWeight || 1;

    const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
    const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

    // Calculate points
    const points = filteredData.map((entry, index) => {
      const x = chartPadding.left + (index / Math.max(1, filteredData.length - 1)) * innerWidth;
      const y = chartPadding.top + innerHeight - ((entry.weightKg - minWeight) / weightRange) * innerHeight;
      return { x, y, entry };
    });

    // Generate smooth path using bezier curves
    let path = '';
    if (points.length > 0) {
      path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        path += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
        path += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
      }
    }

    // Generate Y-axis labels
    const yLabelCount = 5;
    const yLabels = Array.from({ length: yLabelCount }, (_, i) => {
      const weight = minWeight + (weightRange * i) / (yLabelCount - 1);
      const y = chartPadding.top + innerHeight - (i / (yLabelCount - 1)) * innerHeight;
      return { weight, y };
    });

    // Generate X-axis labels
    const xLabelCount = Math.min(5, filteredData.length);
    const xLabels = xLabelCount > 0 ? Array.from({ length: xLabelCount }, (_, i) => {
      const index = xLabelCount === 1 ? 0 : Math.floor((i / (xLabelCount - 1)) * (filteredData.length - 1));
      const entry = filteredData[index];
      if (!entry) return null;
      const x = chartPadding.left + (index / Math.max(1, filteredData.length - 1)) * innerWidth;
      const date = new Date(entry.date);
      return {
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        x
      };
    }).filter(Boolean) as { label: string; x: number }[] : [];

    // Goal line Y position
    let goalLineY = null;
    if (targetWeightKg && targetWeightKg >= minWeight && targetWeightKg <= maxWeight) {
      goalLineY = chartPadding.top + innerHeight - ((targetWeightKg - minWeight) / weightRange) * innerHeight;
    }

    return { path, points, yLabels, xLabels, goalLineY, minWeight, maxWeight };
  }, [filteredData, chartWidth, chartHeight, targetWeightKg]);

  const formatWeight = (kg: number) => {
    const lbs = kg * 2.20462;
    return `${lbs.toFixed(1)} lbs`;
  };

  const formatWeightChange = (kg: number) => {
    const lbs = kg * 2.20462;
    const sign = lbs >= 0 ? '+' : '';
    return `${sign}${lbs.toFixed(1)} lbs`;
  };

  const primaryColor = isDark ? DarkColors.primary : Colors.primary;
  const secondaryColor = isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen;
  const textColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const secondaryTextColor = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const surfaceColor = isDark ? DarkColors.surface : Colors.surface;

  if (!weightHistory || weightHistory.length === 0) {
    return (
      <View className="py-6 items-center">
        <Icon name={Icons.CHART_OUTLINE} size={IconSizes.XL} color={secondaryTextColor} accessibilityLabel="No data" />
        <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center">
          Log your weight to see trends and statistics
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Time Period Selector */}
      <View className="flex-row justify-center mb-4">
        <View
          className="flex-row rounded-lg p-1"
          style={{ backgroundColor: surfaceColor }}
        >
          {TIME_PERIODS.map(period => (
            <HapticTouchableOpacity
              key={period.key}
              onPress={() => {
                setSelectedPeriod(period.key);
                setSelectedPoint(null);
              }}
              className="px-3 py-1.5 rounded-md"
              style={{
                backgroundColor: selectedPeriod === period.key ? primaryColor : 'transparent',
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{
                  color: selectedPeriod === period.key ? '#FFFFFF' : secondaryTextColor,
                }}
              >
                {period.label}
              </Text>
            </HapticTouchableOpacity>
          ))}
        </View>
      </View>

      {filteredData.length < 2 ? (
        <View className="py-6 items-center">
          <Text className="text-gray-500 dark:text-gray-400 text-sm text-center">
            Need at least 2 data points for this period
          </Text>
        </View>
      ) : (
        <>
          {/* Chart */}
          <View className="items-center mb-4">
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={primaryColor} stopOpacity={0.3} />
                  <Stop offset="100%" stopColor={primaryColor} stopOpacity={0.05} />
                </LinearGradient>
              </Defs>

              {/* Grid lines */}
              {chartData.yLabels.map((label, i) => (
                <Line
                  key={i}
                  x1={chartPadding.left}
                  y1={label.y}
                  x2={chartWidth - chartPadding.right}
                  y2={label.y}
                  stroke={isDark ? '#374151' : '#E5E7EB'}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              ))}

              {/* Area fill */}
              {chartData.path && chartData.points.length > 0 && (
                <Path
                  d={`${chartData.path} L ${chartData.points[chartData.points.length - 1].x} ${chartHeight - chartPadding.bottom} L ${chartData.points[0].x} ${chartHeight - chartPadding.bottom} Z`}
                  fill="url(#chartGradient)"
                />
              )}

              {/* Goal line */}
              {chartData.goalLineY && targetWeightKg && (
                <>
                  <Line
                    x1={chartPadding.left}
                    y1={chartData.goalLineY}
                    x2={chartWidth - chartPadding.right}
                    y2={chartData.goalLineY}
                    stroke={secondaryColor}
                    strokeWidth={2}
                    strokeDasharray="6,4"
                  />
                  <SvgText
                    x={chartWidth - chartPadding.right - 5}
                    y={chartData.goalLineY - 5}
                    fontSize={10}
                    fill={secondaryColor}
                    textAnchor="end"
                  >
                    Goal
                  </SvgText>
                </>
              )}

              {/* Line */}
              {chartData.path && (
                <Path
                  d={chartData.path}
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {chartData.points.map((point, i) => (
                <Circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r={selectedPoint?.id === point.entry.id ? 6 : 4}
                  fill={selectedPoint?.id === point.entry.id ? primaryColor : '#FFFFFF'}
                  stroke={primaryColor}
                  strokeWidth={2}
                  onPress={() => setSelectedPoint(point.entry)}
                />
              ))}

              {/* Y-axis labels */}
              {chartData.yLabels.map((label, i) => (
                <SvgText
                  key={i}
                  x={chartPadding.left - 5}
                  y={label.y + 4}
                  fontSize={10}
                  fill={secondaryTextColor}
                  textAnchor="end"
                >
                  {Math.round(label.weight * 2.20462)}
                </SvgText>
              ))}

              {/* X-axis labels */}
              {chartData.xLabels.map((label, i) => (
                <SvgText
                  key={i}
                  x={label.x}
                  y={chartHeight - 8}
                  fontSize={10}
                  fill={secondaryTextColor}
                  textAnchor="middle"
                >
                  {label.label}
                </SvgText>
              ))}
            </Svg>
          </View>

          {/* Selected point info */}
          {selectedPoint && (
            <View
              className="mb-4 p-3 rounded-lg"
              style={{ backgroundColor: surfaceColor }}
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-xs" style={{ color: secondaryTextColor }}>
                    {new Date(selectedPoint.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <Text className="text-lg font-bold" style={{ color: textColor }}>
                    {formatWeight(selectedPoint.weightKg)}
                  </Text>
                </View>
                {selectedPoint.notes && (
                  <Text className="text-xs flex-1 ml-4" style={{ color: secondaryTextColor }}>
                    "{selectedPoint.notes}"
                  </Text>
                )}
                <HapticTouchableOpacity onPress={() => setSelectedPoint(null)}>
                  <Icon name={Icons.CLOSE} size={IconSizes.SM} color={secondaryTextColor} accessibilityLabel="Close" />
                </HapticTouchableOpacity>
              </View>
            </View>
          )}

          {/* Statistics Grid */}
          <View className="flex-row flex-wrap">
            {/* Total Change */}
            <View className="w-1/2 p-1">
              <View
                className="p-3 rounded-lg"
                style={{ backgroundColor: surfaceColor }}
              >
                <Text className="text-xs mb-1" style={{ color: secondaryTextColor }}>
                  Total Change
                </Text>
                <Text
                  className="text-base font-bold"
                  style={{
                    color: stats.totalChange <= 0 ? secondaryColor : Colors.secondaryRed
                  }}
                >
                  {formatWeightChange(stats.totalChange)}
                </Text>
              </View>
            </View>

            {/* Weekly Rate */}
            <View className="w-1/2 p-1">
              <View
                className="p-3 rounded-lg"
                style={{ backgroundColor: surfaceColor }}
              >
                <Text className="text-xs mb-1" style={{ color: secondaryTextColor }}>
                  Weekly Rate
                </Text>
                <Text
                  className="text-base font-bold"
                  style={{
                    color: stats.weeklyRate <= 0 ? secondaryColor : Colors.secondaryRed
                  }}
                >
                  {formatWeightChange(stats.weeklyRate)}/wk
                </Text>
              </View>
            </View>

            {/* Average */}
            <View className="w-1/2 p-1">
              <View
                className="p-3 rounded-lg"
                style={{ backgroundColor: surfaceColor }}
              >
                <Text className="text-xs mb-1" style={{ color: secondaryTextColor }}>
                  Average
                </Text>
                <Text className="text-base font-bold" style={{ color: textColor }}>
                  {formatWeight(stats.average)}
                </Text>
              </View>
            </View>

            {/* Range */}
            <View className="w-1/2 p-1">
              <View
                className="p-3 rounded-lg"
                style={{ backgroundColor: surfaceColor }}
              >
                <Text className="text-xs mb-1" style={{ color: secondaryTextColor }}>
                  Range
                </Text>
                <Text className="text-base font-bold" style={{ color: textColor }}>
                  {formatWeight(stats.min)} - {formatWeight(stats.max)}
                </Text>
              </View>
            </View>

            {/* Goal Progress */}
            {targetWeightKg && (
              <View className="w-full p-1">
                <View
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: surfaceColor }}
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs" style={{ color: secondaryTextColor }}>
                      Goal Progress
                    </Text>
                    <Text className="text-xs font-semibold" style={{ color: secondaryColor }}>
                      {Math.round(stats.progressToGoal)}%
                    </Text>
                  </View>
                  <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, stats.progressToGoal)}%`,
                        backgroundColor: secondaryColor,
                      }}
                    />
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-xs" style={{ color: secondaryTextColor }}>
                      Start: {formatWeight(stats.startWeight)}
                    </Text>
                    <Text className="text-xs font-semibold" style={{ color: secondaryColor }}>
                      Goal: {formatWeight(targetWeightKg)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}
