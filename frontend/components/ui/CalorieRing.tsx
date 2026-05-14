import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { EditorialFontFamily } from '../../constants/Typography';

interface CalorieRingProps extends ViewProps {
  consumed: number;
  goal: number;
  size?: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function CalorieRing({ consumed, goal, size = 140, testID, style, ...props }: CalorieRingProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / goal, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View testID={testID} style={[{ width: size, height: size }, style]} {...props}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#FFF3E0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Fill */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#FFB74D"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.consumed}>{formatNumber(consumed)}</Text>
        <Text style={styles.goal}>OF {formatNumber(goal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumed: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 28,
    letterSpacing: -1,
    color: '#111827',
  },
  goal: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: '#6B6B6B',
    marginTop: 2,
  },
});
