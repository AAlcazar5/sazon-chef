import React from 'react';
import { View, Text, StyleSheet, ViewProps, Platform } from 'react-native';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';
import { DarkColors } from '../../constants/Colors';

interface StatItem {
  value: string;
  label: string;
}

interface StatStripProps extends ViewProps {
  stats: StatItem[];
}

export function StatStrip({ stats, style, ...props }: StatStripProps) {
  const shadowStyle = Platform.select({
    ios: EditorialShadows.cardRaised.ios,
    android: EditorialShadows.cardRaised.android,
    default: {},
  });
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const containerBg = isDark ? DarkColors.card : '#FFFFFF';
  const valueColor = isDark ? DarkColors.text.primary : '#111827';
  const labelColor = isDark ? DarkColors.text.tertiary : '#9CA3AF';
  const dividerBg = isDark ? DarkColors.border.light : '#F0EAE2';

  return (
    <View style={[styles.container, { backgroundColor: containerBg }, shadowStyle, { marginTop: -28 }, style]} {...props}>
      {stats.map((stat, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View testID="stat-divider" style={[styles.divider, { backgroundColor: dividerBg }]} />}
          <View style={styles.statCol}>
            <Text style={[styles.value, { color: valueColor }]}>{stat.value}</Text>
            <Text style={[styles.label, { color: labelColor }]}>{stat.label.toUpperCase()}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    zIndex: 10,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  label: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 10,
    letterSpacing: 1.0,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
  },
});
