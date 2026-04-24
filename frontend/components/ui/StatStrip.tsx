import React from 'react';
import { View, Text, StyleSheet, ViewProps, Platform } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';

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

  return (
    <View style={[styles.container, shadowStyle, { marginTop: -28 }, style]} {...props}>
      {stats.map((stat, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View testID="stat-divider" style={styles.divider} />}
          <View style={styles.statCol}>
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label.toUpperCase()}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
  },
  label: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#9CA3AF',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#F0EAE2',
  },
});
